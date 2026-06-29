// src/app/(main)/document-management/contracts/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Files, Download, Trash2 } from "lucide-react";
import type { Document as DocumentType } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase/client";
import { ref, deleteObject } from "firebase/storage";
import { ContractGeneratorDialog } from "@/components/documents/contract-generator-dialog";

export default function ContractsPage() {
  const { documents, addDocument, deleteDocuments, employees } = useMasterData();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [isGeneratorOpen, setGeneratorOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentType | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    let userDocuments = documents;

    if (currentUser?.role !== 'superadmin') {
      userDocuments = documents.filter(doc => doc.company === currentUser?.company);
    }
    
    return userDocuments.filter(doc => doc.category === 'Kontrak Kerja');
  }, [documents, currentUser]);


  const openDeleteDialog = (doc: DocumentType) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      if (documentToDelete.fileName) {
        const fileRef = ref(storage, `documents/${documentToDelete.company}/${documentToDelete.fileName}`);
        await deleteObject(fileRef).catch(e => console.warn("File not found in storage, proceeding to delete DB record."));
      }

      await deleteDocuments([documentToDelete.id]);
      toast({
        title: "Dokumen Dihapus",
        description: `Dokumen "${documentToDelete.title}" telah berhasil dihapus.`,
      });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Gagal Menghapus Dokumen",
            description: e.message || "Terjadi kesalahan.",
        });
    } finally {
      setDocumentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Files />
                  Manajemen Kontrak Kerja
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                  Buat dan kelola semua dokumen kontrak kerja karyawan dari template.
                </CardDescription>
              </div>
              <Button onClick={() => setGeneratorOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Buat Kontrak dari Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul Dokumen</TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Tanggal Unggah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>{doc.employeeName}</TableCell>
                      <TableCell>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), "d MMM yyyy, HH:mm", { locale: localeId }) : '-'}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Buka menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-2 h-4 w-4" />
                                  Unduh
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(doc)}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Belum ada dokumen kontrak yang dibuat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <ContractGeneratorDialog
        isOpen={isGeneratorOpen}
        onOpenChange={setGeneratorOpen}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteDocument}
        itemName={documentToDelete?.title || ''}
        itemType="dokumen"
      />
    </>
  );
}
