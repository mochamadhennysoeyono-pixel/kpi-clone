
// src/components/master-data/kpi-categories/kpi-category-form-dialog.tsx
"use client";

import { useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { KpiCategory, Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_KPI_CATEGORIES } from '@/lib/default-data';

const categorySchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  code: z.string().min(1, "Kode kategori harus diisi"),
  name: z.string().min(1, "Nama kategori harus diisi"),
  description: z.string().min(1, "Deskripsi harus diisi"),
  status: z.enum(['Aktif', 'Tidak Aktif']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface KpiCategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category?: KpiCategory;
  onSave: (data: Omit<KpiCategory, 'id'> & { id?: string }) => void;
  kpiCategories: KpiCategory[];
  companies: Company[];
}

export function KpiCategoryFormDialog({ isOpen, onOpenChange, category, onSave, kpiCategories, companies }: KpiCategoryFormDialogProps) {
  const { currentUser, userRole } = useAuth();

  const defaultCategoryIds = useMemo(() => new Set(DEFAULT_KPI_CATEGORIES.map(c => c.id)), []);
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      status: 'Aktif',
      company: '',
    },
  });
  
  const isEditing = !!category;

  useEffect(() => {
    if (isOpen) {
      if (category) {
        form.reset(category);
      } else {
        const defaultCompany = userRole !== 'superadmin' ? currentUser?.company || '' : '';
        form.reset({
          id: undefined,
          code: '',
          name: '',
          description: '',
          status: 'Aktif',
          company: defaultCompany,
        });
      }
    }
  }, [category, form, isOpen, userRole, currentUser]);

  const onSubmit = (data: CategoryFormValues) => {
    // Firestore's addDoc fails if an `id` field is present but undefined.
    // We clean the object before saving.
    const dataToSave = { ...data };
    if (!dataToSave.id) {
      delete dataToSave.id;
    }
    onSave(dataToSave);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Ubah Kategori KPI' : 'Buat Kategori KPI Baru'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Perbarui detail kategori di bawah ini.' : 'Isi formulir di bawah ini untuk membuat kategori baru.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {userRole === 'superadmin' && (
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perusahaan</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih perusahaan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.filter(c => c.status === 'Aktif').map(c => (
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="cth., F atau CUST" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="cth., Kualitas Kode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Jelaskan untuk apa kategori ini" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                      </SelectContent>
                    </Select>
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
