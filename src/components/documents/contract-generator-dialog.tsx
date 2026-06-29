// src/components/documents/contract-generator-dialog.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from "react-hook-form";
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
import { Stepper, Step } from "@/components/ui/stepper";
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import type { Employee, DocumentTemplate } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, FileText, User, FileCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase/client';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';


interface ContractGeneratorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const steps = [
  { label: "Pilih Karyawan & Template", icon: User },
  { label: "Isi Data Kontrak", icon: FileText },
  { label: "Preview & Simpan", icon: FileCheck },
];

export function ContractGeneratorDialog({ isOpen, onOpenChange }: ContractGeneratorDialogProps) {
  const { employees, documentTemplates, addDocument } = useMasterData();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm();
  
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = () => setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const employeeOptions = useMemo(() => {
    if (currentUser?.role === 'superadmin') return employees;
    return employees.filter(e => e.company === currentUser?.company);
  }, [employees, currentUser]);

  const contractTemplates = useMemo(() => {
    return (documentTemplates || []).filter(t => t.category === 'Kontrak Kerja');
  }, [documentTemplates]);

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployee(employees.find(e => e.id === employeeId) || null);
  };
  
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(documentTemplates.find(t => t.id === templateId) || null);
  };
  
  const handleFormInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({...prev, [placeholder]: value}));
  };
  
  // This is a placeholder for future implementation
  const finalHtmlContent = useMemo(() => {
    if (!selectedTemplate) return '<h1>Template tidak dipilih atau gagal dimuat.</h1><p>Fitur preview dari file .docx sedang dikembangkan.</p>';
    
    let content = `
      <h2>Pratinjau Dokumen</h2>
      <p><strong>Template:</strong> ${selectedTemplate.name}</p>
      <p><strong>Karyawan:</strong> ${selectedEmployee?.name || 'N/A'}</p>
      <hr>
      <h3>Data yang Diisi:</h3>
      <ul>
    `;
    
    if (Object.keys(formData).length > 0) {
      for (const [key, value] of Object.entries(formData)) {
          const formattedKey = key.replace(/{{|}}/g, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          content += `<li><strong>${formattedKey}:</strong> ${value}</li>`;
      }
    } else {
        content += '<li>Tidak ada data tambahan yang diisi.</li>';
    }
    content += `</ul><hr><p class="italic text-muted-foreground mt-4">Catatan: Fitur untuk mengubah file .docx menjadi preview PDF sedang dalam tahap pengembangan. Untuk saat ini, dokumen akan disimpan sebagai referensi.</p>`;
    
    return content;
  }, [selectedTemplate, selectedEmployee, formData]);

  const handleSaveContract = async () => {
    if (!selectedEmployee || !selectedTemplate || !currentUser) {
        toast({ variant: 'destructive', title: "Data tidak lengkap." });
        return;
    }
    setIsGenerating(true);

    const title = `Kontrak Kerja - ${selectedEmployee.name}`;
    
    try {
        // Since we can't generate a PDF yet, we'll save the metadata and a reference
        // to the template and the data filled in.
        await addDocument({
            title: title,
            category: 'Kontrak Kerja',
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            company: selectedEmployee.company,
            fileName: `Generated from: ${selectedTemplate.fileName}`,
            fileType: 'application/vnd.kipi.generated-contract',
            fileUrl: selectedTemplate.fileUrl || '', // Store template URL for now
            uploadedBy: currentUser.id,
            // We could add a field here to store the formData JSON string
            // contextData: JSON.stringify(formData),
        });

        toast({ title: "Kontrak Berhasil Dibuat", description: "Metadata kontrak telah disimpan. Fitur unduh PDF akan tersedia di pembaruan selanjutnya." });
        onOpenChange(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: e.message });
    } finally {
        setIsGenerating(false);
    }
  };

  useEffect(() => {
      if (!isOpen) {
          // Reset state when dialog closes
          setSelectedEmployee(null);
          setSelectedTemplate(null);
          setFormData({});
          setActiveStep(0);
      }
  }, [isOpen]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Select onValueChange={handleSelectEmployee} value={selectedEmployee?.id}>
              <SelectTrigger><SelectValue placeholder="Pilih Karyawan..." /></SelectTrigger>
              <SelectContent><ScrollArea className="h-64">{employeeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</ScrollArea></SelectContent>
            </Select>
            <Select onValueChange={handleSelectTemplate} value={selectedTemplate?.id}>
              <SelectTrigger><SelectValue placeholder="Pilih Template Kontrak..." /></SelectTrigger>
              <SelectContent><ScrollArea className="h-64">{contractTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</ScrollArea></SelectContent>
            </Select>
          </div>
        );
      case 1:
        const placeholders = selectedTemplate?.variables?.map(v => v.key).filter(p => !['{{nama_karyawan}}', '{{posisi}}', '{{departemen}}'].includes(p)) || [];
        if (placeholders.length === 0) {
            return <p className="text-muted-foreground text-center py-8">Template ini tidak memiliki kolom data tambahan untuk diisi.</p>
        }
        return (
          <Form {...form}>
            <form className="space-y-4">
              {placeholders.map(placeholder => (
                  <FormField
                    key={placeholder}
                    control={form.control}
                    name={placeholder}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{placeholder.replace(/{{|}}/g, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={e => handleFormInputChange(placeholder, e.target.value)} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              ))}
            </form>
          </Form>
        );
      case 2:
        return (
            <div className="border rounded-md h-full min-h-[400px]">
                <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: finalHtmlContent }} />
            </div>
        );
      default:
        return null;
    }
  };
  
  const isLastStep = activeStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>Buat Kontrak Baru</DialogTitle>
          <DialogDescription>Ikuti langkah-langkah untuk membuat dokumen kontrak baru dari template.</DialogDescription>
        </DialogHeader>

        <Stepper initialStep={0} steps={steps} activeStep={activeStep} className="py-4" />
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-6 -mr-6">
            {renderStepContent()}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
            <div className="flex justify-between w-full">
                <Button onClick={prevStep} disabled={activeStep === 0 || isGenerating} variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Sebelumnya</Button>
                {isLastStep ? (
                    <Button onClick={handleSaveContract} disabled={isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Simpan & Selesai
                    </Button>
                ) : (
                    <Button onClick={nextStep} disabled={(activeStep === 0 && (!selectedEmployee || !selectedTemplate))}>
                        Selanjutnya <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
