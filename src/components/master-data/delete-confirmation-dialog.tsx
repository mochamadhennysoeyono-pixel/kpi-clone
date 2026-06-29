// src/components/master-data/delete-confirmation-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const confirmationKeyword = "hapus";

  useEffect(() => {
    if (!isOpen) {
      // Reset text when dialog is closed
      setConfirmationText("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (confirmationText === confirmationKeyword) {
      onConfirm();
      onOpenChange(false);
    }
  };

  const isButtonDisabled = confirmationText !== confirmationKeyword;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus {itemType}{" "}
            <strong>{itemName}</strong> secara permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
            <Label htmlFor="confirmation-text">Ketik '<span className="font-bold text-destructive">{confirmationKeyword}</span>' untuk konfirmasi</Label>
            <Textarea 
                id="confirmation-text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Ketik di sini..."
                className="focus-visible:ring-destructive"
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isButtonDisabled}
            className="bg-destructive hover:bg-destructive/90"
          >
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
