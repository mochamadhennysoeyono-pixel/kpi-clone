// src/components/appraisal/supervisor-selection-dialog.tsx
"use client";

import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Employee } from "@/types";

export type RaterSelection = {
  id: string;
  name: string;
};

interface SupervisorSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subject: Employee | null;
  allOptions: RaterSelection[];
  currentSelectionId: string | null;
  onSave: (subjectId: string, supervisorId: string | null) => void;
}

export function SupervisorSelectionDialog({
  isOpen,
  onOpenChange,
  subject,
  allOptions,
  currentSelectionId,
  onSave,
}: SupervisorSelectionDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentSelectionId);
    }
  }, [isOpen, currentSelectionId]);

  const handleSave = () => {
    if (!subject) return;
    onSave(subject.id, selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sesuaikan Penilai Atasan</DialogTitle>
          <DialogDescription>
            Pilih atasan yang akan menilai <strong>{subject?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-64 border rounded-md">
            <RadioGroup
                value={selectedId ?? "none"}
                onValueChange={(value) => setSelectedId(value === "none" ? null : value)}
                className="p-4 space-y-2"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="rater-none" />
                    <Label htmlFor="rater-none" className="font-normal cursor-pointer">
                        Tidak Ada Atasan
                    </Label>
                </div>
                {allOptions.length > 0 ? allOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={`rater-${option.id}`} />
                        <Label htmlFor={`rater-${option.id}`} className="font-normal cursor-pointer">
                            {option.name}
                        </Label>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-10">Tidak ada pilihan atasan yang tersedia.</p>
                )}
            </RadioGroup>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>Simpan Pilihan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
