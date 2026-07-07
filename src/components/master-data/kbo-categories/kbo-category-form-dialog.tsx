// src/components/master-data/kbo-categories/kbo-category-form-dialog.tsx
"use client";

import { useEffect } from 'react';
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
import type { KboCategory, Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';

const categorySchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  name: z.string().min(1, "Nama kategori harus diisi"),
  description: z.string().min(1, "Deskripsi harus diisi"),
  status: z.enum(['Aktif', 'Tidak Aktif']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface KboCategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item?: KboCategory;
  onSave: (data: Omit<KboCategory, 'id'> & { id?: string }) => void;
  companies: Company[];
}

export function KboCategoryFormDialog({ isOpen, onOpenChange, item, onSave, companies }: KboCategoryFormDialogProps) {
  const { currentUser, userRole } = useAuth();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'Aktif',
      company: '',
    },
  });
  
  const isEditing = !!item;

  useEffect(() => {
    if (isOpen) {
      if (item) {
        form.reset(item);
      } else {
        const defaultCompany = userRole !== 'superadmin' ? currentUser?.company || '' : '';
        form.reset({
          id: undefined,
          name: '',
          description: '',
          status: 'Aktif',
          company: defaultCompany,
        });
      }
    }
  }, [item, form, isOpen, userRole, currentUser]);

  const onSubmit = (data: CategoryFormValues) => {
    const dataToSave = { ...data };
    if (!dataToSave.id) {
      delete dataToSave.id;
    }
    onSave(dataToSave as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Ubah Kategori KBO' : 'Buat Kategori KBO Baru'}</DialogTitle>
              <DialogDescription>
                Lengkapi rincian kategori kompetensi perilaku di bawah ini.
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
                          <SelectItem value="Global">Global (Semua Perusahaan)</SelectItem>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="cth., Core Values" {...field} />
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
                      <Textarea placeholder="Jelaskan definisi kategori ini" {...field} />
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
