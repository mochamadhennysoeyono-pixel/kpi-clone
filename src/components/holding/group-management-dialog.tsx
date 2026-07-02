
// src/components/holding/group-management-dialog.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import HoldingGroupManagement from './holding-group-management';
import type { Company } from '@/types';
import { ScrollArea } from '../ui/scroll-area';

interface GroupManagementDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    holdingCompany: Company;
    childCompanies: Company[];
}

export function GroupManagementDialog({ 
    isOpen, 
    onOpenChange, 
    holdingCompany, 
    childCompanies 
}: GroupManagementDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 shrink-0 bg-background border-b">
                    <DialogTitle className="text-xl font-bold font-headline">Manajemen Grup Perusahaan</DialogTitle>
                    <DialogDescription>
                        Kelola seluruh anak perusahaan, cabang, atau unit bisnis Anda di bawah <strong>{holdingCompany.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0 bg-muted/5">
                    <ScrollArea className="h-full p-6">
                        <HoldingGroupManagement 
                            holdingCompany={holdingCompany} 
                            childCompanies={childCompanies} 
                        />
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
