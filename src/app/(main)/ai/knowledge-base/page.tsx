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
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit />
              Manajemen Tools AI
            </CardTitle>
            <CardDescription>
              Kelola "kepribadian" dan "peran" untuk setiap tugas yang akan dijalankan oleh AI.
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Tools
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full space-y-2">
             {(aiTools || []).map((tool) => (
                <AccordionItem value={tool.id} key={tool.id} className="border-b-0">
                    <Card className="bg-muted/30">
                        <div className="flex items-center">
                            <AccordionTrigger className="p-4 hover:no-underline flex-1 text-left">
                                <h3 className="font-semibold">{tool.name}</h3>
                            </AccordionTrigger>
                            <div className="pr-4" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(tool)}><Edit className="mr-2 h-4 w-4"/>Ubah</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteDialog(tool)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Hapus</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-3">
                                {(tool.knowledgeItems || []).map(item => (
                                <div key={item.id} className="p-3 border rounded-md bg-background text-sm">
                                    <Badge variant="outline" className="mb-2">{item.type}</Badge>
                                    <p className="text-muted-foreground whitespace-pre-wrap font-mono text-xs">{item.content}</p>
                                </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
             ))}
          </Accordion>
           {(!aiTools || aiTools.length === 0) && (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Belum ada tools AI yang dibuat.</p>
                </div>
           )}
        </CardContent>
      </Card>
      
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
    </>
  );
}
