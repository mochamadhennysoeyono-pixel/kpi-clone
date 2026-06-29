// src/components/collab/task-detail-dialog.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    UserPlus, 
    Tag, 
    Calendar, 
    CheckSquare, 
    Paperclip, 
    Image as ImageIcon, 
    ArrowRight, 
    Copy, 
    Lock, 
    Pencil, 
    Plus,
    MessageSquare,
    Mic,
    ShieldCheck,
    Layout,
    Clock,
    Activity,
    User,
    FileText,
    X,
    Check,
    Loader2,
    Search,
    Palette,
    Tags,
    ExternalLink,
    File,
    FileAudio,
    FileVideo,
    ChevronDown,
    ChevronsRight,
    Circle,
    PlayCircle,
    CheckCircle2,
    XCircle,
    Trash2,
    Send,
    AtSign
} from 'lucide-react';
import { Label } from "@/components/ui/label";
import type { CollabTask, CollabSpace, CollabTaskStatus, Employee, CollabChecklistItem, Contributor, CollabTaskAttachment, CollabSpaceList, CollabActivityLogEntry } from '@/types';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { Progress } from '../ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    taskId: string | null;
    space: CollabSpace;
}

const statusConfig: Record<CollabTaskStatus, { label: string, color: string, icon: any }> = {
    'todo': { label: 'To Do List', color: 'bg-slate-400', icon: Circle },
    'in-progress': { label: 'Dikerjakan', color: 'bg-blue-500', icon: PlayCircle },
    'done': { label: 'Selesai', color: 'bg-green-500', icon: CheckCircle2 },
    'cancelled': { label: 'Batal', color: 'bg-red-500', icon: XCircle },
};

const THEME_COLORS = [
    { name: 'Biru', value: '#3b82f6' },
    { name: 'Hijau', value: '#22c55e' },
    { name: 'Kuning', value: '#eab308' },
    { name: 'Merah', value: '#ef4444' },
    { name: 'Ungu', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Oranye', value: '#f97316' },
    { name: 'Abu-abu', value: '#64748b' },
];

const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const formatSafeDate = (date: any, formatStr: string) => {
    const d = safeToDate(date);
    if (!d || !isValid(d)) return 'N/A';
    return format(d, formatStr, { locale: localeId });
};

function LogText({ text, members }: { text: string, members: Employee[] }) {
    const parts = text.split(/(@\w+(?:\s\w+)*)/g);
    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    const name = part.substring(1);
                    const isMember = members.some(m => m.name.toLowerCase().includes(name.toLowerCase()));
                    if (isMember) {
                        return <span key={i} className="font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{part}</span>;
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

function SidebarSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase px-1">{title}</h4>
            <div className="space-y-1.5">
                {children}
            </div>
        </div>
    );
}

function SidebarButton({ icon: Icon, label, onClick, disabled, className }: { icon: any, label: string, onClick?: () => void, disabled?: boolean, className?: string }) {
    return (
        <Button 
            variant="secondary" 
            size="sm" 
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full justify-start gap-2.5 bg-muted/50 hover:bg-muted text-foreground/80 font-medium text-xs h-9 border-none shadow-none transition-all active:scale-95",
                className
            )}
        >
            <Icon className="size-4 opacity-70" />
            {label}
        </Button>
    );
}

function MemberSelector({ 
    members, 
    assignedIds, 
    onToggle, 
    title = "Pilih Pemilik Tugas" 
}: { 
    members: Employee[], 
    assignedIds: Set<string>, 
    onToggle: (m: Employee) => void,
    title?: string 
}) {
    const [search, setSearch] = useState("");
    
    const filteredMembers = useMemo(() => {
        return members
            .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [members, search]);

    return (
        <div className="w-72 p-0 overflow-hidden flex flex-col bg-background rounded-lg border shadow-xl">
            <div className="p-3 border-b bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-tight mb-3 text-center text-muted-foreground">{title}</h4>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input 
                        placeholder="Cari anggota..." 
                        className="h-8 pl-8 text-xs bg-background" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>
            <ScrollArea className="h-64">
                <div className="p-1.5 space-y-0.5">
                    {filteredMembers.map(member => {
                        const isSelected = assignedIds.has(member.id);
                        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                        
                        return (
                            <button 
                                key={member.id}
                                type="button"
                                className={cn(
                                    "flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-xs transition-all group",
                                    isSelected && "bg-primary/5 text-primary font-bold"
                                )}
                                onClick={() => onToggle(member)}
                            >
                                <Avatar className="size-7 ring-1 ring-border group-hover:ring-primary/20">
                                    <AvatarFallback className={cn("text-[9px] font-black", isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="truncate">{member.name}</p>
                                    <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">{member.position}</p>
                                </div>
                                {isSelected && <Check className="size-3.5 shrink-0 animate-in zoom-in duration-200" />}
                            </button>
                        );
                    })}
                    {filteredMembers.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground text-[10px] italic">
                            Anggota tidak ditemukan.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function AttachmentIcon({ type }: { type: string }) {
    if (type.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />;
    if (type.startsWith('video/')) return <FileVideo className="size-4 text-purple-500" />;
    if (type.startsWith('audio/')) return <FileAudio className="size-4 text-amber-500" />;
    if (type.includes('pdf')) return <FileText className="size-4 text-red-500" />;
    return <File className="size-4 text-muted-foreground" />;
}

// Reusable Mention Picker Logic for Dialog
function MentionSuggestions({ 
    search, 
    index, 
    members, 
    onSelect,
    className 
}: { 
    search: string | null, 
    index: number, 
    members: Employee[], 
    onSelect: (m: Employee) => void,
    className?: string 
}) {
    if (search === null) return null;
    
    const filtered = members
        .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) return null;

    return (
        <div className={cn("z-[600] bg-background border rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200", className)}>
            <div className="p-2 bg-muted/30 border-b flex items-center gap-2">
                <AtSign size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Sebut Tim</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
                {filtered.map((member, idx) => (
                    <button
                        key={member.id}
                        className={cn(
                            "flex items-center gap-3 w-full p-2 text-left hover:bg-muted transition-colors",
                            idx === index && "bg-primary/5 border-l-2 border-primary"
                        )}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(member);
                        }}
                    >
                        <Avatar className="size-6">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {member.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold">{member.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function TaskDetailDialog({ isOpen, onOpenChange, taskId, space }: TaskDetailDialogProps) {
    const { collabTasks, employees, updateCollabTask, deleteCollabTask } = useMasterData();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    
    const task = useMemo(() => collabTasks.find(t => t.id === taskId), [collabTasks, taskId]);
    const activeLists = useMemo(() => space.lists || [], [space.lists]);
    
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState('');
    const [commentText, setCommentText] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mention States
    const [mentionSearch, setMentionSearch] = useState<{ type: 'desc' | 'comment', search: string } | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const commentRef = useRef<HTMLInputElement>(null);

    const spaceMembers = useMemo(() => employees.filter(e => space.memberIds.includes(e.id)), [employees, space.memberIds]);

    const filteredMentionMembers = useMemo(() => {
        if (!mentionSearch) return [];
        return spaceMembers
            .filter(m => m.name.toLowerCase().includes(mentionSearch.search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [spaceMembers, mentionSearch]);

    useEffect(() => {
        if (task) {
            setTempDesc(task.description || '');
        }
    }, [task]);

    if (!task) return null;

    const createdAt = safeToDate(task.createdAt) || new Date();
    const currentList = Array.isArray(activeLists) 
        ? activeLists.find(l => l.id === task.listId || (!task.listId && l.id === task.status)) || { id: task.status, title: statusConfig[task.status]?.label || task.status }
        : { id: task.status, title: statusConfig[task.status]?.label || task.status };

    const logActivity = (action: string, type: 'activity' | 'comment' = 'activity') => {
        if (!currentUser) return task.activityLog || [];
        
        const mentions = spaceMembers
            .filter(m => action.toLowerCase().includes(`@${m.name.toLowerCase()}`))
            .map(m => m.id);

        const entry: CollabActivityLogEntry = {
            id: `log_${Date.now()}`,
            authorId: currentUser.id,
            authorName: currentUser.name,
            timestamp: new Date(),
            action,
            type,
            mentions
        };
        return [...(task.activityLog || []), entry];
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, type: 'desc' | 'comment') => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        
        if (type === 'desc') setTempDesc(value);
        else setCommentText(value);

        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionSearch({ type, search: mentionMatch[1] });
            setMentionIndex(0);
        } else {
            setMentionSearch(null);
        }
    };

    const insertMention = (member: Employee) => {
        if (!mentionSearch) return;
        
        const isDesc = mentionSearch.type === 'desc';
        const input = isDesc ? descRef.current : commentRef.current;
        if (!input) return;

        const currentVal = isDesc ? tempDesc : commentText;
        const cursorPos = input.selectionStart || 0;
        const textBeforeCursor = currentVal.slice(0, cursorPos);
        const textAfterCursor = input.value.slice(cursorPos);
        
        const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, `@${member.name} `);
        const finalVal = newTextBefore + textAfterCursor;

        if (isDesc) setTempDesc(finalVal);
        else setCommentText(finalVal);
        
        setMentionSearch(null);
        
        setTimeout(() => {
            input.focus();
            const newPos = newTextBefore.length;
            input.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionSearch && filteredMentionMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredMentionMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredMentionMembers.length) % filteredMentionMembers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMentionMembers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionSearch(null);
            }
        } else if (e.key === 'Enter' && !e.shiftKey && mentionSearch === null && commentText.trim()) {
            // Normal comment send
            if ((e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault();
                handleSendComment();
            }
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim() || !currentUser) return;
        setIsLoading(true);
        try {
            const mentions = spaceMembers
                .filter(m => commentText.toLowerCase().includes(`@${m.name.toLowerCase()}`))
                .map(m => m.id);

            const activityLog = logActivity(commentText.trim(), 'comment');
            await updateCollabTask(task.id, { activityLog, updatedAt: serverTimestamp() });
            
            // Push Real Notifications for Mentions
            if (mentions.length > 0) {
                for (const mentionId of mentions) {
                    if (mentionId !== currentUser.id) {
                        await addDoc(collection(db, "notifications"), {
                            recipientId: mentionId,
                            senderName: currentUser.name,
                            category: 'CollabSpace',
                            message: `${currentUser.name} menyebut Anda di komentar tugas "${task.title}"`,
                            link: `/collab-space/${space.id}`,
                            isRead: false,
                            timestamp: serverTimestamp()
                        });
                    }
                }
            }

            setCommentText('');
            toast({ title: "Komentar terkirim" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal mengirim komentar", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDescription = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const mentions = spaceMembers
                .filter(m => tempDesc.toLowerCase().includes(`@${m.name.toLowerCase()}`))
                .map(m => m.id);

            const activityLog = logActivity("memperbarui deskripsi tugas");
            await updateCollabTask(task.id, { description: tempDesc, mentions, activityLog, updatedAt: serverTimestamp() });
            
            // Push Real Notifications for Mentions in Description
            if (mentions.length > 0) {
                for (const mentionId of mentions) {
                    if (mentionId !== currentUser.id) {
                        await addDoc(collection(db, "notifications"), {
                            recipientId: mentionId,
                            senderName: currentUser.name,
                            category: 'CollabSpace',
                            message: `${currentUser.name} menyebut Anda dalam deskripsi tugas "${task.title}"`,
                            link: `/collab-space/${space.id}`,
                            isRead: false,
                            timestamp: serverTimestamp()
                        });
                    }
                }
            }

            setIsEditingDesc(false);
            toast({ title: "Deskripsi diperbarui" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menyimpan", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAssignee = async (member: Employee) => {
        if (!currentUser) return;
        const currentIds = task.assigneeIds || [];
        const isAssigned = currentIds.includes(member.id);
        
        let nextIds: string[];
        if (isAssigned) {
            nextIds = currentIds.filter(id => id !== member.id);
        } else {
            nextIds = [...currentIds, member.id];
        }

        try {
            const action = isAssigned ? `menghapus penugasan ${member.name}` : `menugaskan ${member.name}`;
            const activityLog = logActivity(action);
            await updateCollabTask(task.id, { assigneeIds: nextIds, activityLog, updatedAt: serverTimestamp() });

            // Notify if newly assigned
            if (!isAssigned && member.id !== currentUser.id) {
                await addDoc(collection(db, "notifications"), {
                    recipientId: member.id,
                    senderName: currentUser.name,
                    category: 'CollabSpace',
                    message: `Anda ditugaskan pada tugas baru: "${task.title}"`,
                    link: `/collab-space/${space.id}`,
                    isRead: false,
                    timestamp: serverTimestamp()
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menugaskan", description: e.message });
        }
    };

    const handleAddLabel = async () => {
        if (!newTagInput.trim()) return;
        const current = task.labels || [];
        if (current.includes(newTagInput.trim())) {
            toast({ title: "Label sudah ada" });
            return;
        }
        const next = [...current, newTagInput.trim()];
        try {
            const activityLog = logActivity(`menambahkan label "${newTagInput.trim()}"`);
            await updateCollabTask(task.id, { labels: next, activityLog, updatedAt: serverTimestamp() });
            setNewTagInput('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menambah label", description: e.message });
        }
    };

    const handleRemoveLabel = async (labelToRemove: string) => {
        const current = task.labels || [];
        const next = current.filter(l => l !== labelToRemove);
        try {
            const activityLog = logActivity(`menghapus label "${labelToRemove}"`);
            await updateCollabTask(task.id, { labels: next, activityLog, updatedAt: serverTimestamp() });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menghapus label", description: e.message });
        }
    };

    const handleUpdateDueDate = async (dateStr: string) => {
        try {
            const activityLog = logActivity(`mengubah tenggat waktu menjadi ${dateStr}`);
            await updateCollabTask(task.id, { dueDate: dateStr, activityLog, updatedAt: serverTimestamp() });
            toast({ title: "Tenggat waktu diperbarui" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal memperbarui tanggal", description: e.message });
        }
    };

    const handleAddChecklistItem = async (text: string) => {
        if (!text.trim()) return;
        const currentChecklist = task.checklist || [];
        const newItem: CollabChecklistItem = { id: `item_${Date.now()}`, text, completed: false };
        try {
            const activityLog = logActivity(`menambahkan item ceklis "${text}"`);
            await updateCollabTask(task.id, { checklist: [...currentChecklist, newItem], activityLog, updatedAt: serverTimestamp() });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menambah ceklis", description: e.message });
        }
    };

    const handleToggleChecklist = async (itemId: string) => {
        const item = task.checklist?.find(i => i.id === itemId);
        if (!item) return;
        
        const next = task.checklist?.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
        const action = !item.completed ? `menyelesaikan item "${item.text}"` : `membatalkan item "${item.text}"`;
        const activityLog = logActivity(action);
        
        try {
            await updateCollabTask(task.id, { checklist: next, activityLog, updatedAt: serverTimestamp() });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal update ceklis", description: e.message });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setUploadProgress(0);

        const storagePath = `collab_attachments/${space.id}/${task.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: "Gagal mengunggah", description: error.message });
                setIsLoading(false);
                setUploadProgress(null);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const newAttachment: CollabTaskAttachment = {
                    name: file.name,
                    url: downloadURL,
                    type: file.type
                };
                const currentAttachments = task.attachments || [];
                const activityLog = logActivity(`mengunggah lampiran "${file.name}"`);
                await updateCollabTask(task.id, { attachments: [...currentAttachments, newAttachment], activityLog, updatedAt: serverTimestamp() });
                setIsLoading(false);
                setUploadProgress(null);
                toast({ title: "File Berhasil Diunggah!" });
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        );
    };

    const handleRemoveAttachment = async (attachment: CollabTaskAttachment) => {
        const next = task.attachments?.filter(a => a.url !== attachment.url);
        try {
            const activityLog = logActivity(`menghapus lampiran "${attachment.name}"`);
            await updateCollabTask(task.id, { attachments: next, activityLog, updatedAt: serverTimestamp() });
            toast({ title: "Lampiran dihapus" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menghapus", description: e.message });
        }
    };

    const handleDeleteTask = async () => {
        const taskIdToDelete = task.id;
        onOpenChange(false);
        try {
            await deleteCollabTask(taskIdToDelete);
            toast({ title: "Tugas dihapus" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menghapus", description: e.message });
        }
    };

    const handleUpdateColor = async (color: string | null) => {
        try {
            const activityLog = logActivity(color ? "mengubah warna tema tugas" : "menghapus warna tema tugas");
            await updateCollabTask(task.id, { coverColor: color || undefined, activityLog, updatedAt: serverTimestamp() });
            toast({ title: color ? "Warna tema diterapkan" : "Warna tema dihapus" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal mengubah warna", description: e.message });
        }
    };

    const handleMoveToList = async (listId: string) => {
        let status: CollabTaskStatus = task.status;
        if (['todo', 'in-progress', 'done', 'cancelled'].includes(listId)) {
            status = listId as CollabTaskStatus;
        }

        const listTitle = Array.isArray(activeLists) 
            ? activeLists.find(l => l.id === listId)?.title || listId
            : statusConfig[listId as CollabTaskStatus]?.label || listId;

        try {
            const activityLog = logActivity(`memindahkan tugas ke "${listTitle}"`);
            await updateCollabTask(task.id, { listId, status, activityLog, updatedAt: serverTimestamp() });
            toast({ title: `Tugas dipindahkan ke ${listTitle}` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal memindahkan", description: e.message });
        }
    };

    const assignedIds = new Set(task.assigneeIds || []);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-background">
                <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">
                        
                        {/* LEFT COLUMN: Content (9 cols) */}
                        <div className="lg:col-span-9 p-6 sm:p-10 space-y-10">
                            
                            {/* Header: Title & Breadcrumb */}
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <Layout className="size-5 mt-1 text-muted-foreground/60" />
                                    <div className="space-y-1">
                                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                                            {task.title}
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>di dalam list</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <span className="font-bold text-foreground/70 underline underline-offset-4 cursor-pointer hover:text-primary transition-colors flex items-center gap-1">
                                                        {currentList.title}
                                                        <ChevronDown size={12} />
                                                    </span>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Pindahkan Ke</DropdownMenuLabel>
                                                    {Array.isArray(activeLists) ? activeLists.map(list => (
                                                        <DropdownMenuItem 
                                                            key={list.id} 
                                                            onSelect={() => handleMoveToList(list.id)}
                                                            className={cn("text-xs", (task.listId === list.id || (!task.listId && list.id === task.status)) && "bg-primary/10 font-bold")}
                                                        >
                                                            {list.title}
                                                            {(task.listId === list.id || (!task.listId && list.id === task.status)) && <Check size={12} className="ml-auto" />}
                                                        </DropdownMenuItem>
                                                    )) : Object.entries(statusConfig).map(([id, cfg]) => (
                                                        <DropdownMenuItem 
                                                            key={id} 
                                                            onSelect={() => handleMoveToList(id)}
                                                            className={cn("text-xs", task.status === id && "bg-primary/10 font-bold")}
                                                        >
                                                            {cfg.label}
                                                            {task.status === id && <Check size={12} className="ml-auto" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <span className="opacity-60">(oleh {task.createdBy === currentUser?.id ? 'Anda' : space.creatorName})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Task Owners, Date, and Labels */}
                            <div className="flex flex-wrap gap-8 ml-8">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PEMILIK TUGAS</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {(task.assigneeIds || []).length > 0 ? (
                                            (task.assigneeIds || []).map(id => {
                                                const member = employees.find(e => e.id === id);
                                                const initial = member?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                                                return (
                                                    <Avatar key={id} className="size-9 ring-2 ring-primary/20 shadow-sm">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initial}</AvatarFallback>
                                                    </Avatar>
                                                );
                                            })
                                        ) : (
                                            <Avatar className="size-9 ring-2 ring-background shadow-sm">
                                                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">?</AvatarFallback>
                                            </Avatar>
                                        )}
                                        
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button type="button" className="size-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all border border-dashed border-muted-foreground/30 text-muted-foreground">
                                                    <Plus className="size-4" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="p-0 border-none shadow-2xl z-[500]" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <MemberSelector 
                                                    members={spaceMembers} 
                                                    assignedIds={assignedIds} 
                                                    onToggle={handleToggleAssignee} 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">DIBUAT PADA</h4>
                                    <div className="h-9 flex items-center px-3 rounded-lg bg-muted/30 border text-xs font-medium text-foreground/70 gap-2">
                                        <Clock className="size-3.5" />
                                        {formatSafeDate(createdAt, "d MMM yyyy")}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LABEL</h4>
                                    <div className="flex items-center gap-1.5 flex-wrap min-h-9">
                                        {(task.labels || []).map(label => (
                                            <Badge key={label} variant="secondary" className="text-[10px] h-7 px-2 font-bold bg-primary/10 text-primary border-none">
                                                {label}
                                            </Badge>
                                        ))}
                                        
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button type="button" className="size-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition-all border border-dashed border-muted-foreground/30 text-muted-foreground">
                                                    <Plus className="size-3.5" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="bottom" align="start" className="p-4 w-72 space-y-4 bg-background rounded-lg border shadow-xl z-[500]" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <h4 className="text-xs font-bold uppercase text-center text-muted-foreground">Kelola Label Kustom</h4>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black opacity-60">Ketik Label &amp; Enter</Label>
                                                    <div className="relative">
                                                        <Tags className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                                        <Input 
                                                            placeholder="cth., Revisi Utama" 
                                                            className="h-9 pl-8 text-xs bg-muted/20 border-none focus-visible:ring-1" 
                                                            value={newTagInput}
                                                            onChange={(e) => setNewTagInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleAddLabel();
                                                            }}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                <Separator />

                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] uppercase font-black opacity-60 mb-2">Label Aktif</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(task.labels || []).length > 0 ? (
                                                            (task.labels || []).map(label => (
                                                                <Badge key={label} variant="secondary" className="text-[9px] h-6 pl-2 pr-1 font-bold bg-primary/10 text-primary border-none gap-1">
                                                                    {label}
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleRemoveLabel(label)}
                                                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                                                    >
                                                                        <X className="size-2.5" />
                                                                    </button>
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <p className="text-[10px] text-muted-foreground italic">Belum ada label.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WARNA TEMA</h4>
                                    <div className="flex items-center gap-2">
                                        {task.coverColor ? (
                                            <div 
                                                className="size-9 rounded-lg shadow-sm border border-white ring-1 ring-black/5" 
                                                style={{ backgroundColor: task.coverColor }}
                                            />
                                        ) : (
                                            <div className="size-9 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                                <Palette className="size-4 text-muted-foreground/40" />
                                            </div>
                                        )}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button type="button" className="size-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition-all border border-dashed border-muted-foreground/30 text-muted-foreground">
                                                    <Plus className="size-3.5" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="bottom" align="start" className="p-4 w-64 space-y-4 bg-background rounded-lg border shadow-xl z-[500]">
                                                <h4 className="text-xs font-bold uppercase text-center text-muted-foreground">Pilih Warna Tema Kartu</h4>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {THEME_COLORS.map(color => (
                                                        <button
                                                            key={color.value}
                                                            type="button"
                                                            className={cn(
                                                                "size-10 rounded-md transition-all border-2 border-transparent hover:scale-110",
                                                                task.coverColor === color.value && "border-primary ring-2 ring-offset-1 ring-primary/20"
                                                            )}
                                                            style={{ backgroundColor: color.value }}
                                                            onClick={() => handleUpdateColor(color.value)}
                                                            title={color.name}
                                                        />
                                                    ))}
                                                </div>
                                                <Separator />
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="w-full text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleUpdateColor(null)}
                                                >
                                                    Hapus Warna Tema
                                                </Button>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Due Date */}
                            <div className="space-y-4 ml-8">
                                <div className="flex items-center gap-2 text-foreground/80">
                                    <Calendar className="size-4 text-muted-foreground/60" />
                                    <h4 className="text-sm font-bold">Tenggat Waktu</h4>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer bg-muted/10 hover:bg-muted/20 border-border/50",
                                                task.status === 'done' ? "opacity-50" : ""
                                            )}>
                                                <div className="bg-background size-8 rounded-lg flex items-center justify-center border shadow-sm">
                                                    <Calendar className="size-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batas Akhir</p>
                                                    <p className="text-sm font-bold">
                                                        {task.dueDate ? formatSafeDate(safeToDate(task.dueDate), "d MMMM yyyy") : 'Belum ditetapkan'}
                                                    </p>
                                                </div>
                                                <ChevronDown className="size-3 text-muted-foreground ml-2" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent side="bottom" align="start" className="p-4 w-64 space-y-3 bg-background rounded-lg border shadow-xl z-[500]">
                                            <h4 className="text-xs font-bold uppercase text-center text-muted-foreground">Set Tenggat Waktu</h4>
                                            <Input 
                                                type="date" 
                                                className="text-xs h-9" 
                                                defaultValue={task.dueDate ? (task.dueDate.toDate ? format(task.dueDate.toDate(), "yyyy-MM-dd") : task.dueDate) : ""}
                                                onChange={(e) => handleUpdateDueDate(e.target.value)}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Section: Description */}
                            <div className="space-y-4 ml-8 relative">
                                <div className="flex items-center gap-2">
                                    <FileText className="size-4 text-muted-foreground/60" />
                                    <h4 className="text-sm font-bold text-foreground/80">Catatan &amp; Deskripsi</h4>
                                    {!isEditingDesc && (
                                        <button 
                                            type="button"
                                            className="ml-auto text-[10px] font-bold text-primary hover:underline"
                                            onClick={() => setIsEditingDesc(true)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                
                                {isEditingDesc ? (
                                    <div className="space-y-3 relative">
                                        <Textarea 
                                            ref={descRef}
                                            value={tempDesc}
                                            onChange={(e) => handleTextChange(e, 'desc')}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Gunakan @ untuk mention tim..."
                                            className="min-h-[120px] text-sm focus-visible:ring-primary/30"
                                            autoFocus
                                        />
                                        {/* Mention UI for Description */}
                                        <MentionSuggestions 
                                            search={mentionSearch?.type === 'desc' ? mentionSearch.search : null}
                                            index={mentionIndex}
                                            members={spaceMembers}
                                            onSelect={insertMention}
                                            className="absolute bottom-full left-0 mb-2 w-full max-w-sm"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" onClick={handleSaveDescription} disabled={isLoading}>
                                                {isLoading && <Loader2 className="size-3 animate-spin mr-2" />}
                                                Simpan
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)} disabled={isLoading}>Batal</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        className={cn(
                                            "p-4 rounded-xl text-sm leading-relaxed border transition-all cursor-pointer",
                                            task.description ? "bg-muted/10 border-border/50 text-foreground/80 hover:bg-muted/20" : "bg-muted/30 border-dashed text-muted-foreground italic hover:border-primary/30"
                                        )}
                                        onClick={() => setIsEditingDesc(true)}
                                    >
                                        {task.description ? <LogText text={task.description} members={spaceMembers} /> : 'Klik untuk menambahkan deskripsi atau instruksi khusus untuk tugas ini...'}
                                    </div>
                                )}
                            </div>

                            {/* Section: Checklist */}
                            <div className="space-y-4 ml-8">
                                <div className="flex items-center gap-2 text-foreground/80">
                                    <CheckSquare className="size-4" />
                                    <h4 className="text-sm font-bold">Daftar Ceklis</h4>
                                </div>
                                <div className="space-y-2">
                                    {(task.checklist || []).map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/10 rounded-lg group">
                                            <div 
                                                className={cn(
                                                    "size-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                                                    item.completed ? "bg-primary border-primary" : "bg-background border-border hover:border-primary"
                                                )}
                                                onClick={() => handleToggleChecklist(item.id)}
                                            >
                                                {item.completed && <Check className="size-3 text-white stroke-[4px]" />}
                                            </div>
                                            <span className={cn("text-xs font-medium", item.completed && "line-through text-muted-foreground")}>{item.text}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Input 
                                            placeholder="Tambah item ceklis..." 
                                            className="h-8 text-xs bg-muted/20 border-none shadow-none focus-visible:ring-primary/20"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddChecklistItem(e.currentTarget.value);
                                                    e.currentTarget.value = "";
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Attachments */}
                            <div className="space-y-4 ml-8">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="size-4 text-muted-foreground/60" />
                                    <h4 className="text-sm font-bold text-foreground/80">Lampiran</h4>
                                    <button 
                                        type="button"
                                        className="ml-auto text-[10px] font-bold text-primary hover:underline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Tambah
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(task.attachments || []).map((att, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 border rounded-xl bg-background hover:bg-muted/10 transition-colors group/att shadow-sm">
                                            <a 
                                                href={att.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                            >
                                                <div className="p-2 bg-muted/50 rounded-lg">
                                                    <AttachmentIcon type={att.type} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate group-hover/att:text-primary transition-colors">{att.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{att.type.split('/')[1]}</p>
                                                </div>
                                            </a>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/att:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleRemoveAttachment(att);
                                                }}
                                            >
                                                <X className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}

                                    <div 
                                        className="group border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 text-center bg-muted/5 hover:bg-muted/20 hover:border-primary/30 transition-all cursor-pointer relative"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploadProgress !== null ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-primary">
                                                    <span>SEDANG MENGUNGGAH...</span>
                                                    <span>{uploadProgress.toFixed(0)}%</span>
                                                </div>
                                                <Progress value={uploadProgress} className="h-1.5" />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-muted-foreground font-medium group-hover:text-primary transition-colors">
                                                    Seret file kemari atau <span className="text-primary underline">klik untuk unggah</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase font-bold">PDF, Image, Docx (Max 10MB)</p>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Comments & Activity */}
                            <div className="space-y-6 ml-8 pt-4 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="size-4 text-muted-foreground/60" />
                                        <h4 className="text-sm font-bold text-foreground/80">Aktivitas &amp; Diskusi</h4>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {(task.activityLog || []).slice().reverse().map(log => (
                                        <div key={log.id} className="flex gap-3 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                                            <Avatar className="size-7 shrink-0 ring-1 ring-border shadow-sm">
                                                <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-black">
                                                    {log.authorName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <div className="font-bold text-foreground">
                                                    {log.authorName} 
                                                    {log.type === 'comment' ? (
                                                        <span className="font-normal text-muted-foreground">:</span>
                                                    ) : (
                                                        <span className="font-normal text-muted-foreground"> {log.action}</span>
                                                    )}
                                                </div>
                                                {log.type === 'comment' && (
                                                    <div className="bg-muted/50 p-3 rounded-xl rounded-tl-none mt-1 text-sm text-foreground/90 border border-border/40 w-fit max-w-[90%] shadow-sm">
                                                        <LogText text={log.action} members={spaceMembers} />
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground mt-1 px-1">
                                                    {formatSafeDate(log.timestamp, "d MMM, HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {(!task.activityLog || task.activityLog.length === 0) && (
                                        <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed">
                                            <MessageSquare className="size-8 mx-auto text-muted-foreground/20 mb-2" />
                                            <p className="text-xs text-muted-foreground italic font-medium">Belum ada riwayat aktivitas atau komentar.</p>
                                        </div>
                                    )}
                                </div>

                                <Separator className="bg-border/40" />

                                {/* Comment Input Area */}
                                <div className="flex items-start gap-3 pt-2 relative">
                                    <Avatar className="size-8 mt-1 shadow-sm">
                                        <AvatarFallback className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                                            {currentUser?.name?.substring(0, 2).toUpperCase() || 'ME'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="relative flex-1 group">
                                        <div className="relative">
                                            <Input 
                                                ref={commentRef}
                                                value={commentText}
                                                onChange={(e) => handleTextChange(e, 'comment')}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Ketik komentar... (Gunakan @ untuk mention)" 
                                                className="h-11 bg-muted/20 border-border/60 shadow-sm pr-12 text-sm rounded-xl focus-visible:ring-primary/20"
                                                disabled={isLoading}
                                            />
                                            {/* Mention UI for Comments */}
                                            <MentionSuggestions 
                                                search={mentionSearch?.type === 'comment' ? mentionSearch.search : null}
                                                index={mentionIndex}
                                                members={spaceMembers}
                                                onSelect={insertMention}
                                                className="absolute bottom-full left-0 mb-2 w-full"
                                            />
                                            <Button 
                                                type="button"
                                                size="icon" 
                                                variant="ghost"
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                                                onClick={handleSendComment}
                                                disabled={isLoading || !commentText.trim()}
                                            >
                                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Sidebar (3 cols) */}
                        <div className="lg:col-span-3 bg-muted/20 border-l border-border/40 p-6 sm:p-8 space-y-8">
                            <SidebarSection title="Aksi Tugas">
                                <SidebarButton 
                                    icon={task.isPrivate ? Lock : ShieldCheck} 
                                    label={task.isPrivate ? "Buka Rahasia" : "Jadikan Rahasia"} 
                                    onClick={() => handleUpdateColor(task.isPrivate ? null : '#f59e0b')}
                                    className={task.isPrivate ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : ""}
                                />
                                <SidebarButton 
                                    icon={Trash2} 
                                    label="Hapus Tugas" 
                                    onClick={handleDeleteTask} 
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700" 
                                />
                            </SidebarSection>

                            <div className="pt-10">
                                <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => onOpenChange(false)}>
                                    <X className="size-3" /> Tutup Dialog
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
