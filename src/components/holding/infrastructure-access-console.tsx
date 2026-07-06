
// src/components/holding/infrastructure-access-console.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HoldingGroupManagement from './holding-group-management';
import { ModuleAccessMapper } from '../portal/module-access-mapper';
import type { Company } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Building, UserCheck, ShieldCheck, GitMerge, LayoutGrid, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfrastructureAccessConsoleProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    holdingCompany: Company;
    childCompanies: Company[];
    isSuperadmin: boolean;
}

export function InfrastructureAccessConsole({ 
    isOpen, 
    onOpenChange, 
    holdingCompany, 
    childCompanies,
    isSuperadmin
}: InfrastructureAccessConsoleProps) {
    const [activeTab, setActiveTab] = useState("topology");

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[95vh] md:h-[90vh] p-0 overflow-hidden border-none shadow-2xl bg-[#fafafa] flex flex-col gap-0">
                <DialogHeader className="p-6 pb-2 shrink-0 bg-white border-b flex flex-col space-y-0.5">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-[#131b2e] flex items-center justify-center text-white shadow-lg">
                            <Layers size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-900">Konsol Infrastruktur & Akses</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                                {isSuperadmin ? "KONTROL GLOBAL SISTEM PERFOM" : `ENTITAS INDUK: ${holdingCompany.name}`}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 bg-white border-b shrink-0 overflow-x-auto no-scrollbar">
                        <TabsList className="bg-transparent h-12 gap-8 p-0">
                            <TabsTrigger 
                                value="topology" 
                                className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 gap-2"
                            >
                                <GitMerge size={14} strokeWidth={3} /> Topologi Grup
                            </TabsTrigger>
                            <TabsTrigger 
                                value="access" 
                                className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 gap-2"
                            >
                                <ShieldCheck size={14} strokeWidth={3} /> Pemetaan Akses Staff
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full">
                            <div className="p-6 sm:p-10 max-w-7xl mx-auto">
                                <TabsContent value="topology" className="m-0 border-none animate-in fade-in duration-300">
                                    <HoldingGroupManagement 
                                        holdingCompany={holdingCompany} 
                                        childCompanies={childCompanies} 
                                    />
                                </TabsContent>
                                <TabsContent value="access" className="m-0 border-none animate-in fade-in duration-300">
                                    <ModuleAccessMapper 
                                        manageableCompanies={[holdingCompany, ...childCompanies]} 
                                        isSuperadmin={isSuperadmin}
                                    />
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
                
                {/* Visual Trim */}
                <div className="h-1 bg-primary shrink-0 opacity-10" />
            </DialogContent>
        </Dialog>
    );
}
