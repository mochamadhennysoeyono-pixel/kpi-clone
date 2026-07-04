// src/components/collab/collab-documents-view.tsx
"use client";

import React, { useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    ImageIcon, 
    FileVideo, 
    FileAudio, 
    File, 
    ExternalLink, 
    Files,
    Calendar,
    Search,
    Download,
    ArrowRight
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabSpace, Employee } from '@/types';
import { Input } from '@/components/ui/input';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '@/components/ui/adaptive-card';

interface CollabDocumentsViewProps {
    space: CollabSpace;
}

interface DocumentRow {
    fileName: string;
    fileUrl: string;
    fileType: string;
    taskName: string;
    taskId: string;
    uploaderName: string;
    uploadedAt: Date;
    size?: number;
}

function getFileIcon(type: string) {
    if (type.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />;
    if (type.startsWith('video/')) return <FileVideo className="size-4 text-purple-500" />;
    if (type.startsWith('audio/')) return <FileAudio className="size-4 text-amber-500" />;
    if (type.includes('pdf')) return <FileText className="size-4 text-red-500" />;
    return <File className="size-4 text-muted-foreground" />;
}

export function CollabDocumentsView({ space }: CollabDocumentsViewProps) {
    const { collabTasks, employees } = useMasterData();
    const [searchTerm, setSearchTerm] = React.useState("");

    // 1. Aggregate all attachments from tasks in this space
    const documentData = useMemo((): DocumentRow[] => {
        const tasksInSpace = collabTasks.filter(t => t.spaceId === space.id);
        const allDocs: DocumentRow[] = [];

        tasksInSpace.forEach(task => {
            if (task.attachments && task.attachments.length > 0) {
                task.attachments.forEach(att => {
                    const uploadDate = task.updatedAt?.toDate ? task.updatedAt.toDate() : (task.createdAt?.toDate ? task.createdAt.toDate() : new Date());
                    const uploader = employees.find(e => e.id === task.createdBy)?.name || "System";

                    allDocs.push({
                        fileName: att.name,
                        fileUrl: att.url,
                        fileType: att.type,
                        taskName: task.title,
                        taskId: task.id,
                        uploaderName: uploader,
                        uploadedAt: uploadDate
                    });
                });
            }
        });

        return allDocs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    }, [collabTasks, space.id, employees]);

    const filteredDocs = useMemo(() => {
        if (!searchTerm) return documentData;
        const lowerSearch = searchTerm.toLowerCase();
        return documentData.filter(doc => 
            doc.fileName.toLowerCase().includes(lowerSearch) || 
            doc.taskName.toLowerCase().includes(lowerSearch) ||
            doc.uploaderName.toLowerCase().includes(lowerSearch)
        );
    }, [documentData, searchTerm]);

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in pb-10">
            {/* Header Metrics using Adaptive System */}
            <div className="flex flex-col gap-4">
                <AdaptiveCardGrid complexity="simple">
                    <AdaptiveMetricCard 
                        title="Total Berkas" 
                        value={documentData.length} 
                        icon={Files} 
                        color="bg-blue-500/10 text-blue-600"
                    />
                    <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5 flex items-end">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Cari berdasarkan nama file, tugas, atau pengunggah..." 
                                className="pl-11 h-11 bg-background border-border/40 shadow-sm rounded-2xl focus-visible:ring-primary/20 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </AdaptiveCardGrid>
            </div>

            {/* Documents List using AdaptiveTable (Table on Desktop, Cards on Mobile) */}
            <AdaptiveTable 
                data={filteredDocs}
                keyExtractor={(doc) => `${doc.taskId}-${doc.fileName}`}
                emptyMessage="Belum ada dokumen yang diunggah di ruangan ini."
                columns={[
                    {
                        header: "Nama Dokumen",
                        cell: (doc) => (
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-background transition-colors">
                                    {getFileIcon(doc.fileType)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate max-w-[250px] text-foreground/90" title={doc.fileName}>
                                        {doc.fileName}
                                    </p>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase mt-0.5 tracking-tighter">
                                        {doc.fileType.split('/')[1] || 'FILE'}
                                    </p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: "Asal Tugas",
                        cell: (doc) => (
                            <Badge variant="outline" className="text-[10px] font-bold h-6 px-2 bg-muted/20 border-border/60 max-w-[150px] truncate block">
                                {doc.taskName}
                            </Badge>
                        )
                    },
                    {
                        header: "PIC",
                        cell: (doc) => (
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                    {doc.uploaderName.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold text-foreground/70">{doc.uploaderName}</span>
                            </div>
                        )
                    },
                    {
                        header: "Tanggal",
                        cell: (doc) => (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                                <Calendar className="size-3" />
                                {format(doc.uploadedAt, "d MMM yyyy", { locale: localeId })}
                            </div>
                        )
                    },
                    {
                        header: "",
                        className: "text-right",
                        cell: (doc) => (
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="Buka File">
                                        <ExternalLink className="size-4" />
                                    </a>
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-green-100 hover:text-green-600">
                                    <a href={doc.fileUrl} download={doc.fileName} title="Unduh File">
                                        <Download className="size-4" />
                                    </a>
                                </Button>
                            </div>
                        )
                    }
                ]}
                renderMobileCard={(doc) => (
                    <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 bg-muted/50 rounded-xl">
                                        {getFileIcon(doc.fileType)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-sm uppercase truncate text-slate-800 leading-tight">{doc.fileName}</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Halaman: {doc.taskName}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase">{format(doc.uploadedAt, "d MMM yy")}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-dashed">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-5 border shadow-sm">
                                        <AvatarFallback className="text-[8px] font-black">{doc.uploaderName.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase truncate max-w-[100px]">{doc.uploaderName}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm" className="h-8 font-black text-[9px] uppercase px-3 rounded-lg border-primary/20 text-primary">
                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">LIHAT</a>
                                    </Button>
                                    <Button asChild variant="secondary" size="sm" className="h-8 font-black text-[9px] uppercase px-3 rounded-lg">
                                        <a href={doc.fileUrl} download={doc.fileName}>UNDUH</a>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            />
        </div>
    );
}

function formatSafeDate(date: any, formatStr: string) {
    const d = safeToDate(date);
    if (!d || !isValid(d)) return '-';
    return format(d, formatStr, { locale: localeId });
}

function safeToDate(dateVal: any): Date | null {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
}
