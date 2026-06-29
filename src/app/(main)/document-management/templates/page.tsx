// src/app/(main)/document-management/templates/page.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useRef } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, MoreHorizontal, FileText, Edit, Copy, Trash2, Eye, Wand2, ChevronDown, Link2, Upload, ClipboardCopy, Tags, X, Download } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import type { DocumentTemplate, DocumentCategory } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { AiDocumentGeneratorDialog } from "@/components/documents/ai-document-generator-dialog";
import { ExternalTemplateDialog } from "@/components/documents/external-template-dialog";
import { useToast } from "@/hooks/use-toast";
import { extractGoogleDocData } from '@/lib/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';


const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "Kontrak Kerja", "Surat Keputusan", "Offering Letter", "Job Description", "Standard Operating Procedure", "Memo Internal", "Perjanjian Kerahasiaan", "Lainnya"
];

const GLOBAL_PLACEHOLDERS = [
    { label: 'Nama Karyawan', value: '{{nama_karyawan}}' },
    { label: 'Posisi', value: '{{posisi}}' },
    { label: 'Departemen', value: '{{departemen}}' },
    { label: 'Perusahaan', value: '{{perusahaan}}' },
    { label: 'Tanggal Bergabung', value: '{{tanggal_bergabung}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Telepon', value: '{{telepon}}' },
    { label: 'Gaji Pokok', value: '{{gaji_pokok}}' },
    { label: 'Tanggal Mulai Kontrak', value: '{{tanggal_mulai_kontrak}}' },
    { label: 'Tanggal Akhir Kontrak', value: '{{tanggal_akhir_kontrak}}' },
    { label: 'Nomor Surat', value: '{{nomor_surat}}' },
    { label: 'Tanggal Hari Ini', value: '{{tanggal_sekarang}}' },
];


export default function TemplatesPage() {
  const router = useRouter();
  const { documentTemplates, addDocumentTemplate, deleteDocumentTemplate } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [templatesToDelete, setTemplatesToDelete] = useState<DocumentTemplate[] | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isAiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [isExternalDialogOpen, setExternalDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [previewingTemplate, setPreviewingTemplate] = useState<DocumentTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    let templates = documentTemplates || [];
    
    if (userRole !== 'superadmin') {
      templates = templates.filter(t => t.company === currentUser?.company || t.company === 'Global');
    }

    if (searchTerm) {
      templates = templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== 'all') {
      templates = templates.filter(t => t.category === categoryFilter);
    }
    return templates.sort((a,b) => (b.createdAt?.toDate() > a.createdAt?.toDate() ? -1 : 1));
  }, [documentTemplates, searchTerm, categoryFilter, currentUser, userRole]);
  
  const handleDeleteConfirm = async () => {
    if (!templatesToDelete) return;
    const idsToDelete = templatesToDelete.map(t => t.id);
    try {
        await Promise.all(idsToDelete.map(id => deleteDocumentTemplate(id)));
        toast({
            title: "Hapus Berhasil",
            description: `${templatesToDelete.length} template telah berhasil dihapus.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus template."
        });
    } finally {
        setDeleteDialogOpen(false);
        setTemplatesToDelete(null);
        setSelectedRowIds([]);
    }
  };

  const openDeleteDialog = (template: DocumentTemplate) => {
    setTemplatesToDelete([template]);
    setDeleteDialogOpen(true);
  }

  const openBulkDeleteDialog = () => {
    const toDelete = filteredTemplates.filter(t => selectedRowIds.includes(t.id));
    if (toDelete.length > 0) {
      setTemplatesToDelete(toDelete);
      setDeleteDialogOpen(true);
    }
  }

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedRowIds(filteredTemplates.map(t => t.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (id: string) => {
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };
  
  const handleImportDocx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
        toast({ variant: 'destructive', title: 'Format File Salah', description: 'Harap unggah file dengan format .docx' });
        return;
    }
    
    setIsUploading(true);
    toast({ title: 'Memproses File...', description: 'Mohon tunggu sebentar.' });

    try {
        const formData = new FormData();
        formData.append('file', file);
        const { placeholders, contentHtml } = await extractGoogleDocData(formData);

        const newTemplateData: Partial<DocumentTemplate> = {
            name: file.name.replace('.docx', ''),
            category: 'Lainnya',
            sourceType: 'docx',
            variables: placeholders.map(ph => ({
                key: ph,
                label: ph.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'string',
            })),
            contentHtml: contentHtml,
            company: currentUser?.company || 'Global',
            createdAt: new Date(),
            createdBy: currentUser?.id || 'system',
        };

        const newDoc = await addDocumentTemplate(newTemplateData as any);
        
        toast({ title: 'Impor Berhasil', description: `Template "${newTemplateData.name}" berhasil diimpor.` });
        if (newDoc) {
          router.push(`/document-management/templates/${newDoc.id}`);
        }

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Gagal Mengimpor', description: e.message });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Placeholder Disalin!",
      description: `"${text}" telah disalin ke clipboard Anda.`
    });
  };


  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-headline flex items-center gap-2">
              <FileText />
              Manajemen Template Dokumen
            </CardTitle>
            <CardDescription>
              Buat dan kelola template untuk berbagai jenis dokumen.
            </CardDescription>
          </div>
           <div className="flex gap-2">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <Tags className="mr-2 h-4 w-4" />
                        Daftar Placeholder
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-[40vh] overflow-y-auto">
                    <DropdownMenuLabel>Placeholder Umum</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        {GLOBAL_PLACEHOLDERS.map(ph => (
                            <DropdownMenuItem key={ph.value} onSelect={() => copyToClipboard(ph.value)}>
                                {ph.label}
                                <span className="ml-auto text-xs tracking-widest text-muted-foreground">{ph.value}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
             </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Buat Template Baru
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/document-management/templates/new')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Buat Manual di Editor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Unggah dari .docx
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAiGeneratorOpen(true)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Buat dengan Bantuan AI
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setExternalDialogOpen(true)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Hubungkan dari Google Docs
                  </DropdownMenuItem>
                   <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportDocx}
                      accept=".docx"
                      className="hidden"
                   />
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cari nama template..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <Checkbox
                      id="select-all"
                      checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredTemplates.length}
                      onCheckedChange={(checked) => handleSelectAll(checked)}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">Pilih Semua</label>
              </div>
              {selectedRowIds.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={openBulkDeleteDialog}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus ({selectedRowIds.length})
                  </Button>
              )}
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(template => (
                  <AccordionItem value={template.id} key={template.id} className="border rounded-lg bg-background">
                     <div className="flex items-center p-4">
                        <Checkbox
                            className="mr-3"
                            checked={selectedRowIds.includes(template.id)}
                            onCheckedChange={() => handleRowSelect(template.id)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <AccordionTrigger className="p-0 hover:no-underline flex-1">
                            <div className="flex items-center justify-between w-full sm:gap-4 text-left">
                                <div className="flex-1">
                                    <p className="font-semibold">{template.name}</p>
                                    <p className="text-sm text-muted-foreground">{template.company}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
                                    <Badge variant="outline">{template.category}</Badge>
                                    <Badge variant={template.sourceType === 'external' ? 'secondary' : 'default'}>{template.sourceType}</Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                     </div>
                     <AccordionContent className="p-4 pt-0">
                        <div className="border-t pt-4 space-y-4">
                           <div className="flex justify-between items-center">
                                <h4 className="text-sm font-semibold">Placeholder Terdeteksi</h4>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewingTemplate(template)}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Lihat Pratinjau
                                </Button>
                           </div>

                            {template.variables && template.variables.length > 0 ? (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {template.variables.map((ph, i) => (
                                      <Button key={i} size="sm" variant="outline" className="text-xs h-auto py-1 px-2 font-mono" onClick={() => copyToClipboard(`{{${ph.key}}}`)}>
                                        {`{{${ph.key}}}`}
                                        <ClipboardCopy className="ml-2 h-3 w-3" />
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Tidak ada placeholder yang terdeteksi.</p>
                            )}

                             <div className="flex justify-end gap-2 mt-4">
                                <Button asChild variant="secondary" size="sm"><Link href={`/document-management/templates/${template.id}`}><Edit className="mr-2 h-4 w-4" />Ubah</Link></Button>
                                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(template)}><Trash2 className="mr-2 h-4 w-4" />Hapus</Button>
                            </div>
                        </div>
                     </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                 <div className="text-center py-10 text-muted-foreground">
                    <p>Tidak ada template yang ditemukan.</p>
                </div>
              )}
          </Accordion>

        </CardContent>
      </Card>
    </div>
    
    <Sheet open={!!previewingTemplate} onOpenChange={(open) => !open && setPreviewingTemplate(null)}>
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full">
            <SheetHeader className="p-6 flex-row items-center justify-between border-b no-print">
                <div className="space-y-1">
                    <SheetTitle>{previewingTemplate?.name}</SheetTitle>
                    <SheetDescription>Pratinjau penuh dari konten template dokumen.</SheetDescription>
                </div>
                 <Button onClick={() => window.print()} className="no-print">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
            </SheetHeader>
            <div id="printable-area" className="flex-1 overflow-y-auto">
                 <div className="prose dark:prose-invert max-w-none p-6" dangerouslySetInnerHTML={{ __html: previewingTemplate?.contentHtml || '<p class="italic">Konten tidak tersedia.</p>' }} />
            </div>
        </SheetContent>
    </Sheet>
    
    <DeleteConfirmationDialog 
      isOpen={isDeleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onConfirm={handleDeleteConfirm}
      itemName={templatesToDelete?.length === 1 ? templatesToDelete[0].name : `${templatesToDelete?.length} template`}
      itemType="template"
    />
    <AiDocumentGeneratorDialog
        isOpen={isAiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
    />
    <ExternalTemplateDialog 
        isOpen={isExternalDialogOpen}
        onOpenChange={setExternalDialogOpen}
    />
    </>
  );
}
