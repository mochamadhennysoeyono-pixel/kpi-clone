
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
import { DialogClose } from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

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
            <DialogContent className="max-w-5xl h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 shrink-0 bg-muted/20 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-0.5">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter">Manajemen Grup Perusahaan</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Entitas Induk: {holdingCompany.name}
                        </DialogDescription>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X size={18} /></Button></DialogClose>
                </DialogHeader>
                <div className="flex-1 min-h-0 bg-[#fafafa]">
                    <ScrollArea className="h-full">
                        <div className="p-6 sm:p-10">
                            <HoldingGroupManagement 
                                holdingCompany={holdingCompany} 
                                childCompanies={childCompanies} 
                            />
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

