// src/components/notifications/notification-template-form-sheet.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { NotificationTemplate } from "@/types";
import { SYSTEM_EVENTS } from "@/lib/default-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Label } from "@/components/ui/label";

const AVAILABLE_VARIABLES = [
  { label: 'Nama Pengguna', value: '{{nama_pengguna}}' },
  { label: 'Nama Subjek', value: '{{nama_subjek}}' },
  { label: 'Nama Departemen', value: '{{nama_departemen}}' },
  { label: 'Periode', value: '{{periode}}' },
  { label: 'Nama Event', value: '{{nama_event}}' },
  { label: 'Tanggal Mulai Event', value: '{{tanggal_mulai_event}}' },
  { label: 'Tanggal Selesai Event', value: '{{tanggal_selesai_event}}' },
];

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama template harus diisi."),
  triggerEventId: z.string().min(1, "Event pemicu harus dipilih."),
  triggerCondition: z.enum(['before_start', 'on_start', 'on_end']),
  triggerOffsetDays: z.coerce.number().min(0, "Offset hari tidak boleh negatif."),
  channel: z.enum(['app', 'email', 'both']),
  recipientTarget: z.enum(['subject', 'supervisor', 'management']),
  subject: z.string().min(1, "Subjek pesan harus diisi."),
  message: z.string().min(1, "Isi pesan tidak boleh kosong."),
  status: z.enum(['Active', 'Draft']),
  company: z.string().default('Global'),
  isDefault: z.boolean().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface NotificationTemplateFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  template?: NotificationTemplate;
  onSave: (data: Omit<NotificationTemplate, 'id'> & { id?: string }) => void;
}

export function NotificationTemplateFormSheet({ isOpen, onOpenChange, template, onSave }: NotificationTemplateFormSheetProps) {
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      triggerEventId: '',
      triggerCondition: 'on_start',
      triggerOffsetDays: 1,
      channel: 'app',
      recipientTarget: 'subject',
      subject: '',
      message: '',
      status: 'Draft',
      company: 'Global',
      isDefault: false,
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        form.reset(template);
      } else {
        form.reset({
          name: '',
          triggerEventId: '',
          triggerCondition: 'on_start',
          triggerOffsetDays: 1,
          channel: 'app',
          recipientTarget: 'subject',
          subject: '',
          message: '',
          status: 'Draft',
          company: 'Global',
          isDefault: false,
        });
      }
    }
  }, [isOpen, template, form]);

  const triggerCondition = form.watch('triggerCondition');
  const isDefaultTemplate = form.watch('isDefault');
  
  const handleInsertVariable = (variable: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${variable}${text.substring(end)}`;
    
    form.setValue('message', newText);

    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  const onSubmit = (data: TemplateFormValues) => {
    const dataToSave = { ...data };
    if (!dataToSave.id) {
        delete (dataToSave as Partial<TemplateFormValues>).id;
    }
    onSave(dataToSave);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{template ? "Ubah Template Notifikasi" : "Buat Template Notifikasi Baru"}</SheetTitle>
              <SheetDescription>
                Atur pesan otomatis yang akan dikirim saat event sistem tertentu terjadi.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 py-4 overflow-y-auto">
              <ScrollArea className="h-full pr-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Template</FormLabel>
                        <FormControl><Input {...field} disabled={isDefaultTemplate} /></FormControl>
                        {isDefaultTemplate && <FormDescription className="text-xs">Nama template default tidak dapat diubah.</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="triggerEventId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pemicu Event Sistem</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isDefaultTemplate}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih Event Pemicu..."/></SelectTrigger></FormControl>
                            <SelectContent>
                                {SYSTEM_EVENTS.map(module => (
                                    <SelectGroup key={module.module}>
                                        <Label className="px-2 py-1.5 text-xs font-semibold">{module.module}</Label>
                                        {module.events.map(event => (
                                            <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                          </Select>
                          {isDefaultTemplate && <FormDescription className="text-xs">Pemicu event default tidak dapat diubah.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="recipientTarget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Penerima</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isDefaultTemplate}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih target..."/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="subject">Karyawan Bersangkutan</SelectItem>
                                <SelectItem value="supervisor">Atasan Langsung</SelectItem>
                                <SelectItem value="management">Manajemen Perusahaan</SelectItem>
                            </SelectContent>
                          </Select>
                          {isDefaultTemplate && <FormDescription className="text-xs">Target default tidak dapat diubah.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="triggerCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kondisi Pemicu</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="on_start">Saat Event Terjadi (On Event)</SelectItem>
                                <SelectItem value="before_start">Sebelum Event Dimulai</SelectItem>
                                <SelectItem value="on_end">Saat Event Selesai</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {triggerCondition === 'before_start' && (
                    <FormField
                      control={form.control}
                      name="triggerOffsetDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kirim ... hari sebelum event</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Pengiriman</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="app">Notifikasi Aplikasi</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="both">Aplikasi & Email</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Pesan / Subjek Email</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Isi Pesan</FormLabel>
                        <FormControl>
                          <Textarea
                            ref={messageTextareaRef}
                            className="h-32"
                            {...field}
                          />
                        </FormControl>
                        <div className="flex flex-wrap gap-1">
                          {AVAILABLE_VARIABLES.map(variable => (
                            <Button
                              type="button"
                              key={variable.value}
                              variant="outline"
                              size="sm"
                              className="text-xs h-auto p-1"
                              onClick={() => handleInsertVariable(variable.value)}
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="Active"><Badge variant="default" className="w-full justify-center">Active</Badge></SelectItem>
                                      <SelectItem value="Draft"><Badge variant="outline" className="w-full justify-center">Draft</Badge></SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
              </ScrollArea>
            </div>
            <SheetFooter className="mt-auto p-6 border-t">
              <SheetClose asChild>
                <Button type="button" variant="outline">Batal</Button>
              </SheetClose>
              <Button type="submit">Simpan Template</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
