
// src/components/master-data/company/company-form-sheet.tsx
"use client";

import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { Company } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';

const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama perusahaan harus diisi"),
  businessField: z.string().min(1, "Bidang usaha harus diisi"),
  address: z.string().min(1, "Alamat harus diisi"),
  status: z.enum(['Aktif', 'Tidak Aktif']),
  canBecomeHolding: z.boolean().optional(),
  hasCustomSubscription: z.boolean().default(false), // New checkbox field
  customPrice: z.coerce.number().optional(),
  customUserLimit: z.coerce.number().int("Limit harus angka bulat").optional(),
  customManagementUserLimit: z.coerce.number().int("Limit harus angka bulat").optional(),
  customCompanyLimit: z.coerce.number().int("Limit harus angka bulat").optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  company?: Company;
  onSave: (data: Company) => void;
}

export function CompanyFormSheet({ isOpen, onOpenChange, company, onSave }: CompanyFormSheetProps) {
  const { userRole } = useAuth();
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      id: '',
      name: '',
      businessField: '',
      address: '',
      status: 'Aktif',
      canBecomeHolding: true,
      hasCustomSubscription: false,
      customPrice: undefined,
      customUserLimit: undefined,
      customManagementUserLimit: undefined,
      customCompanyLimit: undefined,
    },
  });
  
  const hasCustomSubscription = form.watch('hasCustomSubscription');

  useEffect(() => {
    if (company) {
      const hasCustomValues =
        company.customPrice != null ||
        company.customUserLimit != null ||
        company.customManagementUserLimit != null ||
        company.customCompanyLimit != null;

      form.reset({
        ...company,
        canBecomeHolding: company.canBecomeHolding ?? true,
        hasCustomSubscription: hasCustomValues,
        customPrice: company.customPrice ?? undefined,
        customUserLimit: company.customUserLimit ?? undefined,
        customManagementUserLimit: company.customManagementUserLimit ?? undefined,
        customCompanyLimit: company.customCompanyLimit ?? undefined,
      });
    } else {
      form.reset({
        id: undefined,
        name: '',
        businessField: '',
        address: '',
        status: 'Aktif',
        canBecomeHolding: true,
        hasCustomSubscription: false,
        customPrice: undefined,
        customUserLimit: undefined,
        customManagementUserLimit: undefined,
        customCompanyLimit: undefined,
      });
    }
  }, [company, form, isOpen]);

  const onSubmit = (data: CompanyFormValues) => {
    const cleanedData: { [key: string]: any } = {
        ...data,
        canBecomeHolding: !!data.canBecomeHolding,
    };
    
    const customFields: (keyof CompanyFormValues)[] = ['customPrice', 'customUserLimit', 'customManagementUserLimit', 'customCompanyLimit'];

    if (data.hasCustomSubscription) {
         // If customization is active, clean up potentially empty fields but keep valid ones
        customFields.forEach(key => {
            const value = data[key];
            if (value === undefined || value === null || isNaN(value as number)) {
                cleanedData[key] = null; // Set to null to remove from Firestore via merge
            } else {
                cleanedData[key] = value;
            }
        });
    } else {
        // If customization is NOT active, explicitly set all custom fields to null
        // to ensure they are removed from the Firestore document on update.
        customFields.forEach(key => {
            cleanedData[key] = null;
        });
    }

    if (!cleanedData.id) {
        delete cleanedData.id;
    }
    
    // We don't need to save hasCustomSubscription to the database
    delete cleanedData.hasCustomSubscription;

    onSave(cleanedData as Company);
    onOpenChange(false);
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>{company ? 'Ubah Data Perusahaan' : 'Tambah Perusahaan Baru'}</SheetTitle>
              <SheetDescription>
                {company ? 'Perbarui detail perusahaan di bawah ini.' : 'Isi formulir di bawah ini untuk menambahkan perusahaan baru.'}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4 px-1 -mx-1">
              <div className="space-y-4 px-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Perusahaan</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., PT Sejahtera Abadi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bidang Usaha</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., Manufaktur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan alamat lengkap perusahaan" {...field} />
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
                 <FormField
                  control={form.control}
                  name="canBecomeHolding"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Izinkan Upgrade Mandiri ke Holding
                        </FormLabel>
                        <FormDescription>
                          Jika diaktifkan, admin perusahaan ini dapat mengupgrade akunnya menjadi holding company.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {userRole === 'superadmin' && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="hasCustomSubscription"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Aktifkan Kustomisasi Langganan (Opsional)
                                </FormLabel>
                                <FormDescription>
                                Aktifkan jika perusahaan ini memerlukan harga atau kuota khusus.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                        />

                      {hasCustomSubscription && (
                        <div className="space-y-4 pl-4 border-l-2 ml-2">
                          <FormField
                            control={form.control}
                            name="customPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Override Harga per Tahun (Rp)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Kosongkan untuk harga standar" {...field} value={field.value ?? ''}/>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="customUserLimit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Override Limit User</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="Std" {...field} value={field.value ?? ''}/>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="customManagementUserLimit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Override Limit Manajemen</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="Std" {...field} value={field.value ?? ''}/>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="customCompanyLimit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Override Limit Grup</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="Std" {...field} value={field.value ?? ''}/>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto p-6 border-t">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </SheetClose>
              <Button type="submit">Simpan</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
