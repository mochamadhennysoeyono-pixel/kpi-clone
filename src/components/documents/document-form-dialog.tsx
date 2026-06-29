// src/components/documents/document-form-dialog.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import type { Document as DocumentType, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Loader2 } from "lucide-react";
import { Progress } from "../ui/progress";

const documentSchema = z.object({
  title: z.string().min(1, "Judul dokumen harus diisi."),
  category: z.string().min(1, "Kategori harus dipilih."),
  employeeId: z.string().min(1, "Karyawan harus dipilih."),
  file: z.instanceof(File).refine(file => file.size > 0, "File harus diunggah."),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

const DOCUMENT_CATEGORIES = ["Kontrak Kerja", "Surat Keputusan", "Job Description", "Peraturan Perusahaan", "Lainnya"];

interface DocumentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<DocumentType, 'id' | 'uploadedAt' | 'fileUrl' | 'fileName' | 'fileType' | 'uploadedBy' >) => Promise<void>;
  employees: Employee[];
  defaultCategory?: string;
}

export function DocumentFormDialog({ isOpen, onOpenChange, onSave, employees, defaultCategory }: DocumentFormDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
  });

  const employeeOptions = useMemo(() => {
    if (currentUser?.role === 'superadmin') return employees;
    return employees.filter(e => e.company === currentUser?.company);
  }, [employees, currentUser]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        category: defaultCategory || '',
        employeeId: '',
        file: undefined,
      });
    }
  }, [isOpen, defaultCategory, form]);


  const onSubmit = async (data: DocumentFormValues) => {
    if (!currentUser) return;
    setIsUploading(true);
    
    const fileName = `${Date.now()}_${data.file.name}`;
    const storageRef = ref(storage, `documents/${currentUser.company}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, data.file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: "destructive", title: "Gagal Unggah", description: "Terjadi kesalahan saat mengunggah file." });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const employee = employees.find(e => e.id === data.employeeId);
          if (!employee) throw new Error("Employee not found");
          
          await onSave({
            title: data.title,
            category: data.category,
            employeeId: data.employeeId,
            employeeName: employee.name,
            company: employee.company,
            fileName: fileName,
            fileType: data.file.type,
            fileUrl: downloadURL,
            uploadedBy: currentUser.id,
          });
          
          toast({ title: "Sukses", description: "Dokumen berhasil diunggah dan disimpan." });
          onOpenChange(false);
          form.reset();
        } catch (saveError: any) {
           toast({ variant: "destructive", title: "Gagal Menyimpan Data", description: saveError.message });
        } finally {
           setIsUploading(false);
        }
      }
    );
  };
  
  useEffect(() => {
    if(!isOpen) {
      form.reset();
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Unggah Dokumen Baru</DialogTitle>
              <DialogDescription>
                Isi detail dan pilih file yang akan diunggah.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Dokumen</FormLabel>
                    <FormControl><Input placeholder="cth., Kontrak Kerja Budi" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Untuk Karyawan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {employeeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name} - {e.company}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Dokumen</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {DOCUMENT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...fieldProps }}) => (
                  <FormItem>
                    <FormLabel>File Dokumen</FormLabel>
                     <FormControl>
                        <Input 
                            type="file" 
                            {...fieldProps} 
                            onChange={e => onChange(e.target.files ? e.target.files[0] : null)}
                        />
                     </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isUploading && <Progress value={uploadProgress} className="w-full" />}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isUploading}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Mengunggah...</> : 'Simpan Dokumen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
