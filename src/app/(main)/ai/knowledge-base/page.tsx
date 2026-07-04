
// src/app/(main)/ai/knowledge-base/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BrainCircuit, PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { AiTool } from "@/types";
import { AiToolFormSheet } from "@/components/ai/ai-tool-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";

export default function AiToolsPage() {
  const { aiTools, addAiTool, updateAiTool, deleteAiTool } = useMasterData();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<AiTool | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<AiTool | null>(null);

  const handleAdd = () => {
    setSelectedTool(undefined);
    setSheetOpen(true);
  };

  const handleEdit = (tool: AiTool) => {
    setSelectedTool(tool);
    setSheetOpen(true);
  };
  
  const handleSave = async (data: Omit<AiTool, 'id'> & { id?: string }) => {
    try {
        if (data.id) {
            await updateAiTool(data.id, data);
            toast({ title: "Tools AI Diperbarui" });
        } else {
            await addAiTool(data);
            toast({ title: "Tools AI Baru Ditambahkan" });
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
    }
  };

  const openDeleteDialog = (tool: AiTool) => {
    setToolToDelete(tool);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (toolToDelete) {
      await deleteAiTool(toolToDelete.id);
      setToolToDelete(null);
      toast({ title: "Tools AI Dihapus" });
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Tools AI"
        description="Kelola kepribadian, peran, dan instruksi khusus untuk setiap tugas yang dijalankan oleh AI KIPI."
        icon={BrainCircuit}
        actions={
          <Button onClick={handleAdd} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Tools Baru
          </Button>
        }
      />

      <div className="space-y-4 pt-4">
          <Accordion type="multiple" className="w-full space-y-3">
             {(aiTools || []).map((tool) => (
                <AccordionItem value={tool.id} key={tool.id} className="border rounded-2xl bg-background shadow-sm overflow-hidden border-border/40">
                    <div className="flex items-center bg-muted/20">
                        <AccordionTrigger className="p-5 hover:no-underline flex-1 text-left">
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <BrainCircuit size={16} />
                                </div>
                                <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">{tool.name}</h3>
                            </div>
                        </AccordionTrigger>
                        <div className="pr-5" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[350]">
                                    <DropdownMenuItem onClick={() => handleEdit(tool)}><Edit className="mr-2 h-4 w-4"/>Ubah Prompt</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteDialog(tool)} className="text-destructive font-bold"><Trash2 className="mr-2 h-4 w-4"/>Hapus Tools</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <AccordionContent className="p-5 pt-4">
                        <div className="space-y-3">
                            {(tool.knowledgeItems || []).map(item => (
                            <div key={item.id} className="p-4 border rounded-xl bg-muted/5 border-dashed">
                                <Badge variant="outline" className="mb-2 text-[8px] font-black uppercase border-none bg-primary/5 text-primary">{item.type}</Badge>
                                <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{item.content}</p>
                            </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
             ))}
          </Accordion>
           {(!aiTools || aiTools.length === 0) && (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/10 opacity-30">
                    <BrainCircuit size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase text-[10px] tracking-[0.2em]">Belum Ada Tools AI</p>
                </div>
           )}
      </div>
      
      <AiToolFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        tool={selectedTool}
        onSave={handleSave}
      />

      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={toolToDelete?.name || ''}
        itemType="tools AI"
      />
    </ResponsivePage>
  );
}
