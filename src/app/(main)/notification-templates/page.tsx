// src/app/(main)/notification-templates/page.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import type { NotificationTemplate } from "@/types";
import { SYSTEM_EVENTS, DEFAULT_NOTIFICATION_TEMPLATES } from "@/lib/default-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, BellRing, Lock } from "lucide-react";
import { NotificationTemplateFormSheet } from "@/components/notifications/notification-template-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";

const getChannelLabel = (channel: 'app' | 'email' | 'both') => {
    switch (channel) {
        case 'app': return 'Aplikasi';
        case 'email': return 'Email';
        case 'both': return 'Aplikasi & Email';
        default: return 'N/A';
    }
}


export default function NotificationTemplatesPage() {
    const { notificationTemplates, addNotificationTemplate, updateNotificationTemplate, deleteNotificationTemplate } = useMasterData();
    const { toast } = useToast();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | undefined>(undefined);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);

    const allSystemEvents = useMemo(() => SYSTEM_EVENTS.flatMap(module => module.events), []);

    const getTriggerDescription = useCallback((template: NotificationTemplate) => {
        const event = allSystemEvents.find(e => e.id === template.triggerEventId);
        const eventName = event ? `Event: "${event.name}"` : 'Event Dihapus';

        switch (template.triggerCondition) {
            case 'before_start': return `${template.triggerOffsetDays} hari sebelum ${eventName}`;
            case 'on_start': return `Saat ${eventName}`;
            case 'on_end': return `Saat ${eventName}`;
            default: return 'Pemicu tidak valid';
        }
    }, [allSystemEvents]);
    
    const combinedTemplates = useMemo(() => {
        const customTemplatesMap = new Map(notificationTemplates.map(t => [t.id, t]));
        
        const defaults: NotificationTemplate[] = DEFAULT_NOTIFICATION_TEMPLATES.map(def => {
            const customVersion = customTemplatesMap.get(def.id);
            if (customVersion) {
                customTemplatesMap.delete(def.id);
                return { ...def, ...customVersion }; 
            }
            return def as NotificationTemplate; 
        });

        const customOnlyTemplates = Array.from(customTemplatesMap.values());

        return [...defaults, ...customOnlyTemplates].sort((a,b) => a.name.localeCompare(b.name));
    }, [notificationTemplates]);

    const handleAddNew = () => {
        setSelectedTemplate(undefined);
        setSheetOpen(true);
    };

    const handleEdit = (template: NotificationTemplate) => {
        setSelectedTemplate(template);
        setSheetOpen(true);
    };

    const handleSave = async (data: Omit<NotificationTemplate, 'id'> & { id?: string }) => {
        try {
            if (data.id) {
                await updateNotificationTemplate(data.id, data);
            } else {
                const { id, ...newTemplateData } = data;
                await addNotificationTemplate(newTemplateData);
            }
            toast({ title: 'Template Disimpan', description: 'Perubahan Anda telah berhasil disimpan.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: error.message });
        }
    };

    const openDeleteDialog = (template: NotificationTemplate) => {
        if(template.isDefault) return;
        setTemplateToDelete(template);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;
        try {
            await deleteNotificationTemplate(templateToDelete.id);
            toast({ title: 'Template Dihapus' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
        } finally {
            setTemplateToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

  return (
    <>
    <div className="space-y-6">
        <Card className="shadow-lg mb-6">
             <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <BellRing />
                            Manajemen Template Notifikasi
                        </CardTitle>
                        <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                            Kelola pesan otomatis yang dikirim berdasarkan event sistem.
                        </CardDescription>
                    </div>
                     <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Template Baru
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Template</TableHead>
                            <TableHead>Pemicu (Trigger)</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {combinedTemplates.length > 0 ? (
                            combinedTemplates.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">
                                        {template.name}
                                        {template.isDefault && <Badge variant="secondary" className="ml-2">Default</Badge>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{getTriggerDescription(template)}</TableCell>
                                    <TableCell><Badge variant="outline">{getChannelLabel(template.channel)}</Badge></TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{template.recipientTarget}</Badge></TableCell>
                                    <TableCell><Badge variant={template.status === 'Active' ? 'default' : 'secondary'}>{template.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(template)}>Ubah</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDeleteDialog(template)} className="text-destructive" disabled={template.isDefault}>Hapus</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Belum ada template notifikasi yang dibuat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
    
    <NotificationTemplateFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        template={selectedTemplate}
        onSave={handleSave}
    />

    <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={templateToDelete?.name || ''}
        itemType="template notifikasi"
    />
    </>
  );
}
