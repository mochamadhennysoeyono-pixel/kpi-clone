// src/app/(main)/document-management/templates/new/page.tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import type { DocumentTemplate } from '@/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

const newTemplateSchema = z.object({
  name: z.string().min(1, "Nama template harus diisi."),
  category: z.enum(['Kontrak Kerja', 'Surat Keputusan', 'Job Description', 'Peraturan Perusahaan', 'Lainnya']),
});

type NewTemplateFormValues = z.infer<typeof newTemplateSchema>;

export default function NewTemplatePage() {
  const router = useRouter();
  const { fetchData } = useMasterData();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<NewTemplateFormValues>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: {
        name: '',
        category: 'Kontrak Kerja',
    }
  });

  const onSubmit = async (data: NewTemplateFormValues) => {
    if (!currentUser) return;
    setIsCreating(true);

    try {
      const newTemplateData: Partial<DocumentTemplate> = {
        name: data.name,
        category: data.category,
        company: currentUser.company,
        sourceType: 'internal', // This is an internal editor template
        pages: [{ id: `page_${Date.now()}`, name: "Halaman 1", contentHtml: '<p>Mulai tulis konten Anda di sini...</p>' }],
      };

      const docRef = await addDoc(collection(db, 'documentTemplates'), newTemplateData);
      
      if (docRef.id) {
        await fetchData(); // Refresh master data
        toast({ title: 'Template Dibuat', description: 'Sekarang Anda bisa mulai mengedit isinya.' });
        router.push(`/document-management/templates/${docRef.id}`);
      } else {
        throw new Error("Gagal mendapatkan ID untuk template baru.");
      }

    } catch (error) {
      console.error("Failed to create new template:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Template', description: (error as Error).message });
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
        </Button>
        <Card>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <FileText />
                           Buat Template Dokumen Baru (Editor Internal)
                        </CardTitle>
                        <CardDescription>Beri nama dan kategori untuk template Anda sebelum mulai menulis.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nama Template</FormLabel>
                                <FormControl>
                                    <Input placeholder="cth., Kontrak Kerja PKWT 1 Tahun" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Kategori</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Kontrak Kerja">Kontrak Kerja</SelectItem>
                                        <SelectItem value="Surat Keputusan">Surat Keputusan</SelectItem>
                                        <SelectItem value="Job Description">Job Description</SelectItem>
                                        <SelectItem value="Peraturan Perusahaan">Peraturan Perusahaan</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Lanjutkan & Mulai Menulis
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    </div>
  );
}
