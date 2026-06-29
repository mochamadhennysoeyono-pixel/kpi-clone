// src/components/collab/collab-documents-view.tsx
"use client";

import React, { useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    ImageIcon, 
    FileVideo, 
    FileAudio, 
    File, 
    ExternalLink, 
    ArrowRight,
    Files,
    User,
    Calendar,
    Search,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabTask, CollabSpace, CollabTaskAttachment, Employee } from '@/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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
                    // We use task metadata as fallback for attachment metadata
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

        // Sort by newest upload first
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
            {/* Header Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                <Card className="bg-background border-border/40 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                            <Files size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total File</p>
                            <p className="text-xl font-black text-foreground">{documentData.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <div className="sm:col-span-2 relative flex items-center">
                    <Search className="absolute left-4 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari berdasarkan nama file, tugas, atau pengunggah..." 
                        className="pl-11 h-full bg-background border-border/40 shadow-sm rounded-xl focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Documents Table */}
            <Card className="flex-1 min-h-0 bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                    {filteredDocs.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[10px] font-bold uppercase py-4">Nama Dokumen</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Asal Tugas</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Ditambahkan Oleh</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Tanggal</TableHead>
                                    <TableHead className="text-right text-[10px] font-bold uppercase">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocs.map((doc, idx) => (
                                    <TableRow key={idx} className="group hover:bg-muted/10 border-border/40 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-background transition-colors">
                                                    {getFileIcon(doc.fileType)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold truncate max-w-[200px] text-foreground/90" title={doc.fileName}>
                                                        {doc.fileName}
                                                    </p>
                                                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">
                                                        {doc.fileType.split('/')[1] || 'FILE'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-medium h-6 px-2 bg-muted/20 border-border/60 max-w-[150px] truncate block">
                                                    {doc.taskName}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {doc.uploaderName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-medium text-foreground/70">{doc.uploaderName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                <Calendar className="size-3" />
                                                {format(doc.uploadedAt, "d MMM yyyy", { locale: localeId })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
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
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-24 text-center space-y-4">
                            <div className="size-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                                <Files className="size-10 text-muted-foreground/20" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-base text-foreground/70">Tidak Ada Dokumen</p>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                    Unggah file ke dalam kartu tugas untuk menampilkannya di pusat dokumen ruangan ini.
                                </p>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </Card>
        </div>
    );
}
