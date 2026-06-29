// src/components/ai/ai-tool-form-sheet.tsx
"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { AiTool, KnowledgeItem, KnowledgeItemType } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

const KNOWLEDGE_TYPES: KnowledgeItemType[] = [
  'System Prompt',
  'User Context Prompt',
  'Task Prompt',
  'Constraint / Rule',
  'Validation Rule',
  'Output Formatter'
];

const knowledgeItemSchema = z.object({
  id: z.string(),
  type: z.enum(['System Prompt', 'User Context Prompt', 'Task Prompt', 'Constraint / Rule', 'Validation Rule', 'Output Formatter']),
  content: z.string().min(1, 'Konten tidak boleh kosong.'),
});

const toolSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama tools harus diisi."),
  knowledgeItems: z.array(knowledgeItemSchema).min(1, "Harus ada minimal satu knowledge item."),
});

type ToolFormValues = z.infer<typeof toolSchema>;

interface AiToolFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tool?: AiTool;
  onSave: (data: Omit<AiTool, 'id'> & { id?: string }) => void;
}

export function AiToolFormSheet({ isOpen, onOpenChange, tool, onSave }: AiToolFormSheetProps) {
  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "knowledgeItems"
  });
  
  const isEditing = !!tool;

  useEffect(() => {
    if (isOpen) {
      if (tool) {
        form.reset(tool);
      } else {
        form.reset({
          name: '',
          knowledgeItems: [{ id: `item_${Date.now()}`, type: 'System Prompt', content: '' }]
        });
      }
    }
  }, [tool, form, isOpen]);

  const onSubmit = (data: ToolFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Ubah Tools AI' : 'Tambah Tools AI Baru'}</SheetTitle>
              <SheetDescription>
                Definisikan nama tools dan serangkaian pengetahuan yang akan menjadi pegangan AI untuk menjalankan tugasnya.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4 px-1 -mx-1">
              <div className="space-y-6 px-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tools</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., Analis Laporan Kinerja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                    <FormLabel>Knowledge Items</FormLabel>
                    {fields.map((field, index) => (
                         <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                                disabled={fields.length <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <FormField
                                control={form.control}
                                name={`knowledgeItems.${index}.type`}
                                render={({ field: itemField }) => (
                                    <FormItem>
                                        <FormLabel>Jenis Knowledge</FormLabel>
                                        <Select onValueChange={itemField.onChange} value={itemField.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {KNOWLEDGE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`knowledgeItems.${index}.content`}
                                render={({ field: itemField }) => (
                                    <FormItem>
                                        <FormLabel>Isi Knowledge</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Masukkan prompt atau aturan di sini..." className="h-24 bg-background" {...itemField} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                         </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ id: `item_${Date.now()}`, type: 'System Prompt', content: '' })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Tambah Knowledge Item
                    </Button>
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </SheetClose>
              <Button type="submit">Simpan Tools</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
