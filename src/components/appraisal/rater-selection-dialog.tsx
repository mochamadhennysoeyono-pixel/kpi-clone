// src/components/appraisal/rater-selection-dialog.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Employee } from "@/types";

export type RaterSelection = {
  id: string;
  name: string;
};

interface RaterSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subject: Employee | null;
  raterType: 'peers' | 'subordinates' | null;
  allOptions: RaterSelection[];
  currentSelection: RaterSelection[];
  onSave: (subjectId: string, raterType: 'peers' | 'subordinates', newSelection: RaterSelection[]) => void;
}

export function RaterSelectionDialog({
  isOpen,
  onOpenChange,
  subject,
  raterType,
  allOptions,
  currentSelection,
  onSave,
}: RaterSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentSelection.map(s => s.id)));
    }
  }, [isOpen, currentSelection]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (!subject || !raterType) return;
    const newSelection = allOptions.filter(opt => selectedIds.has(opt.id));
    onSave(subject.id, raterType, newSelection);
    onOpenChange(false);
  };
  
  const raterTypeLabel = raterType === 'peers' ? 'Rekan Sejawat' : 'Bawahan';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sesuaikan Penilai: {raterTypeLabel}</DialogTitle>
          <DialogDescription>
            Pilih secara manual {raterTypeLabel.toLowerCase()} untuk menilai <strong>{subject?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-64 border rounded-md">
            <div className="p-4 space-y-2">
                {allOptions.length > 0 ? allOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`rater-${option.id}`}
                            checked={selectedIds.has(option.id)}
                            onCheckedChange={() => handleToggle(option.id)}
                        />
                        <Label htmlFor={`rater-${option.id}`} className="font-normal cursor-pointer">
                            {option.name}
                        </Label>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-10">Tidak ada pilihan yang tersedia.</p>
                )}
            </div>
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
