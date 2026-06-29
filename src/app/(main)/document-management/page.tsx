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
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase/client";
import { ref, deleteObject } from "firebase/storage";

export default function DocumentManagementPage() {
  const { documents, addDocument, deleteDocuments, employees } = useMasterData();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentType | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    let userDocuments = documents;

    if (currentUser?.role !== 'superadmin') {
      userDocuments = documents.filter(doc => doc.company === currentUser?.company);
    }
    
    // This page is for contracts, so filter by category
    return userDocuments.filter(doc => doc.category === 'Kontrak Kerja');
  }, [documents, currentUser]);


  const handleSaveDocument = async (data: Omit<DocumentType, 'id' | 'uploadedAt' | 'fileUrl' | 'fileName' | 'fileType' | 'uploadedBy' >) => {
    try {
      await addDocument(data);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Dokumen",
        description: e.message || "Terjadi kesalahan saat menyimpan data.",
      });
    }
  };

  const openDeleteDialog = (doc: DocumentType) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      // Delete the file from Firebase Storage first
      const fileRef = ref(storage, `documents/${documentToDelete.company}/${documentToDelete.fileName}`);
      await deleteObject(fileRef);

      // Then delete the document from Firestore
      await deleteDocuments([documentToDelete.id]);
      toast({
        title: "Dokumen Dihapus",
        description: `Dokumen "${documentToDelete.title}" telah berhasil dihapus.`,
      });
    } catch (e: any) {
      if (e.code === 'storage/object-not-found') {
        // If file not found in storage, still proceed to delete from Firestore
        await deleteDocuments([documentToDelete.id]);
        toast({
            variant: "default",
            title: "Dokumen Dihapus dari Database",
            description: "File di storage tidak ditemukan, namun data dokumen telah dihapus.",
        });
      } else {
        toast({
            variant: "destructive",
            title: "Gagal Menghapus Dokumen",
            description: e.message || "Terjadi kesalahan.",
        });
      }
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
                  Kelola semua dokumen kontrak kerja karyawan.
                </CardDescription>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Unggah Dokumen
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      Belum ada dokumen kontrak yang diunggah.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <DocumentFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveDocument}
        employees={employees}
        defaultCategory="Kontrak Kerja"
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
