// src/components/documents/table-customization-dialog.tsx
"use client";

import { useState } from "react";
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

interface TableCustomizationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: ({ rows, cols }: { rows: number; cols: number }) => void;
}

export function TableCustomizationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: TableCustomizationDialogProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleConfirm = () => {
    onConfirm({ rows, cols });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Atur Ukuran Tabel</DialogTitle>
          <DialogDescription>
            Tentukan jumlah baris dan kolom untuk tabel baru Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rows">Jumlah Baris</Label>
            <Input
              id="rows"
              type="number"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cols">Jumlah Kolom</Label>
            <Input
              id="cols"
              type="number"
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm}>Buat Tabel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
