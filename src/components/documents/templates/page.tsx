// src/app/(main)/documents/templates/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, MoreHorizontal, FileText, Edit, Copy, Trash2, Eye } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import type { DocumentTemplate } from "@/types/documents";
import { useAuth } from "@/contexts/auth-context";

const DOCUMENT_CATEGORIES = [
  "PKWT",
  "PKWTT",
  "Surat Keputusan Direksi",
  "Surat Peringatan",
  "Offering Letter",
  "Job Description",
  "Standard Operating Procedure",
  "Memo Internal",
  "Perjanjian Kerahasiaan",
  "Other",
] as const;


export default function TemplatesPage() {
  const router = useRouter();
  const { documentTemplates, deleteDocumentTemplate } = useMasterData();
  const { currentUser, userRole } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    return templates;
  }, [documentTemplates, searchTerm, categoryFilter, currentUser, userRole]);
  
  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteDocumentTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openDeleteDialog = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  }

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
          <Button onClick={() => router.push('/documents/templates/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Template Baru
          </Button>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Template</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.category}</TableCell>
                    <TableCell>{template.company}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/documents/templates/${template.id}`}><Edit className="mr-2 h-4 w-4" />Ubah</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/documents/templates/${template.id}/use`}><Eye className="mr-2 h-4 w-4" />Gunakan</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} disabled><Copy className="mr-2 h-4 w-4" />Duplikat</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteDialog(template)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Tidak ada template yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <DeleteConfirmationDialog 
      isOpen={isDeleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onConfirm={handleDeleteConfirm}
      itemName={templateToDelete?.name || ''}
      itemType="template"
    />
    </>
  );
}
