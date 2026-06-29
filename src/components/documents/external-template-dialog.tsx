// src/components/documents/external-template-dialog.tsx
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
import { Loader2, Link2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate, DocumentCategory, Variable } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { extractGoogleDocData } from '@/lib/actions';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';


const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "Kontrak Kerja", "Surat Keputusan", "Offering Letter", "Job Description", "Standard Operating Procedure", "Memo Internal", "Perjanjian Kerahasiaan", "Lainnya"
];

interface ExternalTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ExternalTemplateDialog({ isOpen, onOpenChange }: ExternalTemplateDialogProps) {
  const { currentUser } = useAuth();
  const { addDocumentTemplate } = useMasterData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Kontrak Kerja');
  const [url, setUrl] = useState('');
  const [manualPlaceholders, setManualPlaceholders] = useState('');


  const handleSave = async () => {
    if (!name.trim() || !url.trim() || !currentUser) {
      toast({ variant: 'destructive', title: "Semua kolom harus diisi." });
      return;
    }
    
    if (!url.startsWith('https://docs.google.com/document/d/e/')) {
      toast({ variant: 'destructive', title: "URL Tidak Valid", description: "Pastikan Anda menyalin URL dari hasil 'Publikasikan ke web'." });
      return;
    }

    setIsLoading(true);
    try {
        const { placeholders: detectedPlaceholders, contentHtml } = await extractGoogleDocData(url);
        
        const manualPhArray = manualPlaceholders.split(',').map(ph => ph.trim()).filter(Boolean);
        const allPlaceholders = [...new Set([...detectedPlaceholders, ...manualPhArray])];

        const variables: Variable[] = allPlaceholders.map(key => ({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'string',
        }));

        const newTemplateData: Omit<DocumentTemplate, 'id'> = {
            name,
            category,
            sourceType: 'external',
            externalUrl: url,
            contentHtml: contentHtml, // Save the fetched HTML
            variables,
            company: currentUser.company || 'Global',
            createdAt: serverTimestamp(),
            createdBy: currentUser.id,
            pages: [],
        };
        
        await addDocumentTemplate(newTemplateData);

        toast({ title: 'Template Eksternal Disimpan', description: `Template "${name}" berhasil dihubungkan. ${allPlaceholders.length} placeholder terdeteksi.` });
        onOpenChange(false);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 /> Hubungkan Template dari Google Docs
          </DialogTitle>
          <DialogDescription>
            Publikasikan dokumen Anda ke web, lalu tempelkan link publikasinya di sini.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-6 -mr-6">
            <div className="grid gap-4 py-4">
                <Alert>
                <AlertTitle>Cara Mendapatkan Link Publikasi</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                    <p>1. Buka file di Google Docs.</p>
                    <p>2. Klik menu <strong>File &gt; Bagikan &gt; Publikasikan ke web</strong>.</p>
                    <p>3. Di tab "Tautan", klik tombol <strong>Publikasikan</strong> dan konfirmasi.</p>
                    <p>4. Salin link yang muncul dan tempelkan di bawah ini.</p>
                </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <Label htmlFor="template-name">Nama Template</Label>
                    <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="cth., Template Kontrak Karyawan" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="template-category">Kategori</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                        <SelectTrigger id="template-category">
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
                    <Label htmlFor="template-url">URL Publikasi Web Google Docs</Label>
                    <Input id="template-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/document/d/e/.../pub" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="manual-placeholders">Placeholder Tambahan (Opsional)</Label>
                    <Textarea 
                    id="manual-placeholders" 
                    value={manualPlaceholders}
                    onChange={e => setManualPlaceholders(e.target.value)}
                    placeholder="Jika ada placeholder yang tidak terdeteksi, ketik di sini dipisahkan koma. Cth: gaji_pokok,tunjangan_transport"
                    />
                </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Simpan & Deteksi Placeholder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
