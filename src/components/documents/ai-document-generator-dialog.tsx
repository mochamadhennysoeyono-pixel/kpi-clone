// src/components/documents/ai-document-generator-dialog.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Label } from "@/components/ui/label";
import { Textarea } from '../ui/textarea';
import { Loader2, Wand2, FileText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { DocumentTemplate, DocumentCategory } from '@/types/documents';
import { useAuth } from '@/contexts/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// This would call a Genkit flow
async function generateDocumentFromPrompt(prompt: string): Promise<{ title: string, contentHtml: string }> {
    // In a real scenario, this would be a call to a Genkit flow.
    // For now, we simulate it.
    console.log("Generating document with prompt:", prompt);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
        title: `AI: ${prompt.substring(0, 30)}...`,
        contentHtml: `<p>Ini adalah konten yang dihasilkan AI berdasarkan prompt:</p><p><strong>${prompt}</strong></p><p>Harap dicatat bahwa ini adalah simulasi dan konten nyata akan jauh lebih komprehensif.</p>`,
    };
}


const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "PKWT", "PKWTT", "Surat Keputusan Direksi", "Surat Peringatan", "Offering Letter", "Job Description", "Standard Operating Procedure", "Memo Internal", "Perjanjian Kerahasiaan", "Other"
];

interface AiDocumentGeneratorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AiDocumentGeneratorDialog({ isOpen, onOpenChange }: AiDocumentGeneratorDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('PKWT');
  const [generatedDoc, setGeneratedDoc] = useState<{ title: string, contentHtml: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: "Perintah tidak boleh kosong." });
      return;
    }
    setIsLoading(true);
    setGeneratedDoc(null);
    try {
      const result = await generateDocumentFromPrompt(prompt);
      setGeneratedDoc(result);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Gagal Menghasilkan Dokumen", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveAndEdit = async () => {
    if (!generatedDoc || !currentUser) {
        toast({ variant: 'destructive', title: "Tidak ada dokumen untuk disimpan." });
        return;
    }
    setIsLoading(true);
    try {
      const newTemplateData: Omit<DocumentTemplate, 'id' | 'updatedAt' | 'variables'> = {
        name: generatedDoc.title,
        category: category,
        company: currentUser.company || 'Global',
        contentHtml: generatedDoc.contentHtml,
        pages: [],
        createdAt: serverTimestamp(),
        createdBy: currentUser.id,
      };
      
      const docRef = await addDoc(collection(db, 'documentTemplates'), newTemplateData);

      toast({ title: 'Template Disimpan!', description: 'Anda akan diarahkan ke editor untuk penyempurnaan.' });
      onOpenChange(false);
      router.push(`/document-management/templates/${docRef.id}`);

    } catch (error) {
       toast({ variant: 'destructive', title: "Gagal Menyimpan Template" });
       setIsLoading(false);
    }
  }
  
  const resetState = () => {
    setPrompt('');
    setCategory('PKWT');
    setGeneratedDoc(null);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 /> Buat Template Dokumen dengan AI
          </DialogTitle>
          <DialogDescription>
            Jelaskan dokumen yang Anda butuhkan, dan biarkan AI membuat draf pertama untuk Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {!generatedDoc && (
                 <>
                    <div className="space-y-2">
                        <Label htmlFor="category">Kategori Dokumen</Label>
                         <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                            <SelectTrigger id="category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Deskripsikan Kebutuhan Dokumen Anda</Label>
                        <Textarea
                        id="prompt"
                        placeholder="Contoh: Buatkan saya template Surat Peringatan Pertama (SP1) untuk karyawan yang tidak mencapai target performa selama 3 bulan berturut-turut. Sertakan bagian untuk detail karyawan, alasan peringatan, dan konsekuensi."
                        className="h-32"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        />
                    </div>
                </>
            )}

            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground p-8">
                    <Loader2 className="h-8 w-8 animate-spin"/>
                    <p>KIPI sedang meracik draf dokumen Anda...</p>
                </div>
            )}

            {generatedDoc && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="font-semibold">{generatedDoc.title}</h3>
                         <Badge variant="secondary">{category}</Badge>
                    </div>
                    <div className="border rounded-md p-4 h-64 overflow-y-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: generatedDoc.contentHtml }} />
                </div>
            )}
        </div>
        <DialogFooter>
            {generatedDoc ? (
                <div className="flex w-full justify-between">
                     <Button type="button" variant="outline" onClick={() => setGeneratedDoc(null)} disabled={isLoading}>
                        Ubah Prompt
                    </Button>
                    <Button onClick={handleSaveAndEdit} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                        Simpan & Edit
                    </Button>
                </div>
            ) : (
                 <>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Buat Draf
                    </Button>
                </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
