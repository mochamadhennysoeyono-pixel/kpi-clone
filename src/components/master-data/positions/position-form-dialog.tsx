// src/components/master-data/positions/position-form-dialog.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import type { Company, Department, Position } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const positionSchema = z.object({
  name: z.string().min(1, "Nama jabatan harus diisi"),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  department: z.string().min(1, "Departemen harus dipilih"),
});

type PositionFormValues = z.infer<typeof positionSchema>;

interface PositionFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Position, 'id'>) => void;
  position?: Position;
  companies: Company[];
  departments: Department[];
}

export function PositionFormDialog({ 
  isOpen, 
  onOpenChange, 
  onSave, 
  position, 
  companies,
  departments 
}: PositionFormDialogProps) {
  const { userRole, currentUser } = useAuth();
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: '',
      company: '',
      department: '',
    },
  });

  const selectedCompany = form.watch('company');

  const companyOptions = useMemo(() => {
    return companies.filter(c => c.status === 'Aktif');
  }, [companies]);

  const departmentOptions = useMemo(() => {
    if (!selectedCompany) return [];
    return departments.filter(d => d.company === selectedCompany);
  }, [departments, selectedCompany]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: position?.name || '',
        company: position?.company || (userRole !== 'superadmin' ? currentUser?.company : ''),
        department: position?.department || '',
      });
    }
  }, [isOpen, position, form, userRole, currentUser]);

  const onSubmit = (data: PositionFormValues) => {
    onSave(data);
    onOpenChange(false);
  };
  
  const isEditing = !!position;
  
  const canChangeCompany = useMemo(() => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'manajemen') {
        const userCompany = companies.find(c => c.name === currentUser?.company);
        return userCompany?.isHolding === true;
    }
    return false;
  }, [userRole, currentUser, companies]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? `Ubah Jabatan` : `Tambah Jabatan Baru`}</DialogTitle>
              <DialogDescription>
                Lengkapi detail untuk jabatan di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {canChangeCompany && (
                 <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Perusahaan</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('department', ''); // Reset department when company changes
                        }} value={field.value} disabled={isEditing && !canChangeCompany}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih perusahaan" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {companyOptions.map(c => (
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
                  name="department"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Departemen</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCompany}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Pilih departemen" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {departmentOptions.map(d => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Jabatan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth., Staf Akunting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
