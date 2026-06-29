
// src/components/collab/collab-task-view.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Clock, 
    MoreHorizontal, 
    Pencil, 
    Trash2, 
    MessageSquare, 
    Plus, 
    CheckCircle, 
    Circle, 
    PlayCircle, 
    XCircle, 
    CheckCircle2, 
    ArrowRight, 
    X, 
    Loader2, 
    Check,
    ChevronDown,
    Copy,
    UserPlus,
    Tag,
    Calendar as CalendarIcon,
    FileText as FileIcon,
    Type,
    Paperclip,
    Lock,
    ChevronsRight,
    CheckSquare,
    Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CollabTask, CollabSpace, CollabTaskStatus, CollabSpaceList, CollabActivityLogEntry, Contributor } from '@/types';
import { cn } from '@/lib/utils';
import { TaskDetailDialog } from './task-detail-dialog';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DeleteConfirmationDialog } from '../master-data/delete-confirmation-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CollabTaskViewProps {
    space: CollabSpace;
}

const statusConfig: Record<CollabTaskStatus, { label: string, color: string, icon: any }> = {
    'todo': { label: 'To Do List', color: 'bg-slate-400', icon: Circle },
    'in-progress': { label: 'Dikerjakan', color: 'bg-blue-500', icon: PlayCircle },
    'done': { label: 'Selesai', color: 'bg-green-500', icon: CheckCircle2 },
    'cancelled': { label: 'Batal', color: 'bg-red-500', icon: XCircle },
};

const DEFAULT_LISTS: CollabSpaceList[] = [
    { id: 'todo', title: 'To Do List' },
    { id: 'in-progress', title: 'Dikerjakan' },
    { id: 'done', title: 'Selesai' },
    { id: 'cancelled', title: 'Batal' },
];

function QuickActionBtn({ icon: Icon, label, onClick, className }: { icon: any, label: string, onClick: () => void, className?: string }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cn(
                "flex items-center gap-2 px-3 py-2 bg-[#2D2E32] hover:bg-[#3E3F44] text-white rounded-md text-[11px] font-medium transition-colors w-full",
                className
            )}
        >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
        </button>
    );
}

function TaskQuickActions({ task, onUpdateStatus, onUpdateTask, onDelete }: { 
    task: CollabTask, 
    onUpdateStatus: (s: CollabTaskStatus) => void,
    onUpdateTask: (data: Partial<CollabTask>, log: string) => void,
    onDelete: () => void
}) {
    const { toast } = useToast();

    const handlePlaceholderAction = (label: string) => {
        toast({ title: label, description: "Fitur ini akan segera tersedia." });
    };

    return (
        <div className="grid grid-cols-2 gap-2 p-2 bg-[#F4F5F7] rounded-lg shadow-xl w-[280px]">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 bg-[#2D2E32] hover:bg-[#3E3F44] text-white rounded-md text-[11px] font-medium transition-colors w-full">
                        <ChevronsRight className="size-3.5 shrink-0" /> Pindah Tugas
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                    {Object.entries(statusConfig).map(([status, config]) => (
                        <DropdownMenuItem key={status} onSelect={() => onUpdateStatus(status as CollabTaskStatus)} className="text-xs">
                            <config.icon className="mr-2 size-3" /> {config.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <QuickActionBtn icon={Copy} label="Salin Tugas" onClick={() => handlePlaceholderAction("Salin Tugas")} />
            <QuickActionBtn icon={MessageSquare} label="Beri Komentar" onClick={() => handlePlaceholderAction("Beri Komentar")} />
            <QuickActionBtn icon={UserPlus} label="Ubah Pemilik" onClick={() => handlePlaceholderAction("Ubah Pemilik")} />
            <QuickActionBtn icon={Tag} label="Ubah Label" onClick={() => handlePlaceholderAction("Ubah Label")} />
            <QuickActionBtn icon={CalendarIcon} label="Ubah Tanggal" onClick={() => handlePlaceholderAction("Ubah Tanggal")} />
            <QuickActionBtn icon={FileIcon} label="Ubah Catatan" onClick={() => handlePlaceholderAction("Ubah Catatan")} />
            <QuickActionBtn icon={Type} label="Ubah Nama" onClick={() => handlePlaceholderAction("Ubah Nama")} />
            <QuickActionBtn icon={Paperclip} label="Unggah File" onClick={() => handlePlaceholderAction("Unggah File")} />
            
            <QuickActionBtn 
                icon={task.isPrivate ? Lock : Circle} 
                label={task.isPrivate ? "Rahasia (Aktif)" : "Jadikan Rahasia"} 
                onClick={() => onUpdateTask({ isPrivate: !task.isPrivate }, task.isPrivate ? "membuka kerahasiaan tugas" : "menjadikan tugas rahasia")} 
                className={task.isPrivate ? "bg-amber-600 hover:bg-amber-700" : ""}
            />
        </div>
    );
}

function TaskCard({ 
    task, 
    isSelected,
    onToggleSelect,
    onOpenDetail,
    onUpdateStatus, 
    onUpdateTask,
    onDuplicate,
    onDeleteRequest 
}: { 
    task: CollabTask, 
    isSelected: boolean,
    onToggleSelect: (id: string) => void,
    onOpenDetail: (t: CollabTask) => void,
    onUpdateStatus: (t: CollabTask, s: CollabTaskStatus) => void, 
    onUpdateTask: (t: CollabTask, data: Partial<CollabTask>, log: string) => void,
    onDuplicate: (t: CollabTask) => void,
    onDeleteRequest: (task: CollabTask) => void 
}) {
    const { employees } = useMasterData();
    const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
    const isDone = task.status === 'done';
    
    const assignees = useMemo(() => {
        return (task.assigneeIds || []).map(id => employees.find(e => e.id === id)).filter(Boolean);
    }, [task.assigneeIds, employees]);

    return (
        <Card className={cn(
            "shadow-sm border border-border/50 bg-background hover:ring-1 hover:ring-primary/20 transition-all group relative cursor-pointer",
            isSelected && "ring-2 ring-primary border-primary bg-primary/5"
        )} onClick={() => onOpenDetail(task)}>
            <div 
                className={cn(
                    "absolute -top-2 -left-2 z-10 size-5 rounded-full border bg-background flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary scale-110" : "opacity-0 group-hover:opacity-100 hover:scale-110 shadow-sm"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(task.id);
                }}
            >
                {isSelected && <Check className="size-3 text-white stroke-[4px]" />}
            </div>

            <CardContent className="p-2 space-y-1.5">
                {task.coverColor && (
                    <div 
                        className="h-1.5 w-full rounded-full mb-1" 
                        style={{ backgroundColor: task.coverColor }}
                    />
                )}
                <div className="flex justify-between items-start gap-2">
                    <h4 className={cn(
                        "font-medium text-[10px] leading-tight break-words flex-1",
                        isDone && "text-muted-foreground line-through"
                    )}>{task.title}</h4>
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 rounded-md bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <Pencil className="h-2 w-2" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" className="p-0 border-none bg-transparent shadow-none w-auto" onClick={(e) => e.stopPropagation()}>
                            <TaskQuickActions 
                                task={task} 
                                onUpdateStatus={(s) => onUpdateStatus(task, s)}
                                onUpdateTask={(data, log) => onUpdateTask(task, data, log)}
                                onDelete={() => onDeleteRequest(task)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                    {dueDate && (
                        <Badge 
                            variant="outline" 
                            className={cn(
                                "text-[7px] h-3 px-1 gap-1 font-bold",
                                isDone ? "bg-green-50 text-white border-none" : "bg-muted text-muted-foreground"
                            )}
                        >
                            {isDone ? <CheckCircle className="h-2 w-2" /> : <Clock className="h-2 w-2" />}
                            {format(dueDate, "d MMM", { locale: localeId })}
                        </Badge>
                    )}
                    {task.description && <MessageSquare className="h-2.5 w-2.5 text-muted-foreground/50" />}
                    {task.isPrivate && <Badge variant="destructive" className="text-[6px] h-3 px-1 leading-none uppercase font-black">RAHASIA</Badge>}
                    {task.checklist && task.checklist.length > 0 && (
                        <Badge variant="outline" className="text-[7px] h-3 px-1 gap-1">
                            <CheckSquare className="h-2 w-2" />
                            {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center justify-between pt-0.5">
                    <div className="flex -space-x-1.5">
                        {assignees.length > 0 ? (
                            assignees.map(member => (
                                <Avatar key={member!.id} className="h-4 w-4 border border-background shadow-sm">
                                    <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                                        {member!.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ))
                        ) : (
                            <Avatar className="h-4 w-4 border border-background shadow-sm">
                                <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">?</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-2 w-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel className="text-[9px] uppercase text-muted-foreground">Opsi Tugas</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onDuplicate(task)} className="text-[10px]">
                                <Copy className="mr-2 h-3 w-3" /> Duplikat
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[9px] uppercase text-muted-foreground">Status Cepat</DropdownMenuLabel>
                            {Object.entries(statusConfig).map(([status, config]) => (
                                <DropdownMenuItem key={status} onSelect={() => onUpdateStatus(task, status as CollabTaskStatus)} disabled={task.status === status} className="text-[10px]">
                                    <config.icon className="mr-2 h-3 w-3" /> {config.label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive text-[10px]" onSelect={() => onDeleteRequest(task)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}

export function CollabTaskView({ space }: CollabTaskViewProps) {
    const { collabTasks, addCollabTask, updateCollabTask, deleteCollabTask, bulkUpdateCollabTasks, updateCollabSpace, fetchData } = useMasterData();
    const { currentUser, userRole } = useAuth();
    const { toast } = useToast();
    
    const [selectedTaskIdForDetail, setSelectedTaskIdForDetail] = useState<string | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [addingToStatus, setAddingToStatus] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState("");

    const [taskToDelete, setTaskToDelete] = useState<CollabTask | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [listToDelete, setListToDelete] = useState<CollabSpaceList | null>(null);
    const [isDeleteListDialogOpen, setIsDeleteListDialogOpen] = useState(false);

    const spaceTasks = useMemo(() => {
        return collabTasks.filter(t => {
            if (t.spaceId !== space.id) return false;
            if (t.taskType === 'daily') return false; // Hide daily tasks from project view

            // Logika Visibilitas Tugas Rahasia (Private)
            if (t.isPrivate) {
                const isCreator = t.createdBy === currentUser?.id;
                const isAssignee = t.assigneeIds?.includes(currentUser?.id || '');
                const isSuperAdmin = userRole === 'superadmin';
                const isManagement = userRole === 'manajemen'; 

                return isCreator || isAssignee || isSuperAdmin || isManagement;
            }

            return true;
        });
    }, [collabTasks, space.id, currentUser, userRole]);

    const activeLists = useMemo(() => {
        return space.lists || DEFAULT_LISTS;
    }, [space.lists]);

    const tasksByList = useMemo(() => {
        const map: Record<string, CollabTask[]> = {};
        activeLists.forEach(list => {
            map[list.id] = spaceTasks.filter(t => t.listId === list.id || (!t.listId && t.status === list.id));
        });
        return map;
    }, [spaceTasks, activeLists]);

    const createLog = (task: CollabTask, action: string) => {
        if (!currentUser) return task.activityLog || [];
        const entry: CollabActivityLogEntry = {
            id: `log_${Date.now()}`,
            authorId: currentUser.id,
            authorName: currentUser.name,
            timestamp: new Date(),
            action,
            type: 'activity'
        };
        return [...(task.activityLog || []), entry];
    };

    const handleToggleSelect = (id: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        setIsLoading(true);
        try {
            await Promise.all(Array.from(selectedTaskIds).map(id => deleteCollabTask(id)));
            toast({ title: "Bulk Delete Berhasil", description: `${selectedTaskIds.size} tugas dihapus.` });
            setSelectedTaskIds(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkUpdateStatus = async (status: CollabTaskStatus) => {
        setIsLoading(true);
        try {
            const label = statusConfig[status].label;
            const logEntryTemplate = (task: CollabTask): CollabActivityLogEntry => ({
                id: `log_${Date.now()}`,
                authorId: currentUser!.id,
                authorName: currentUser!.name,
                timestamp: new Date(),
                action: `memperbarui status menjadi ${label} (Bulk)`,
                type: 'activity'
            });

            await Promise.all(Array.from(selectedTaskIds).map(async id => {
                const task = collabTasks.find(t => t.id === id);
                if (task) {
                    const activityLog = [...(task.activityLog || []), logEntryTemplate(task)];
                    return updateCollabTask(id, { status, listId: status, activityLog });
                }
            }));

            setSelectedTaskIds(new Set());
            await fetchData(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenInlineForm = (listId: string) => {
        setAddingToStatus(listId);
        setNewTaskTitle("");
        setIsPrivate(false);
    };

    const handleCancelInline = () => {
        setAddingToStatus(null);
        setNewTaskTitle("");
        setIsPrivate(false);
    };

    const handleCreateTask = async (listId: string) => {
        if (!newTaskTitle.trim() || !currentUser) return;
        setIsLoading(true);
        try {
            let status: CollabTaskStatus = 'todo';
            if (['in-progress', 'done', 'cancelled'].includes(listId)) {
                status = listId as CollabTaskStatus;
            }

            const initialLog: CollabActivityLogEntry = {
                id: `log_${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                timestamp: new Date(),
                action: "membuat tugas proyek ini",
                type: 'activity'
            };

            await addCollabTask({
                spaceId: space.id,
                company: space.company,
                title: newTaskTitle,
                status: status,
                listId: listId,
                taskType: 'project',
                priority: 'medium',
                isPrivate: isPrivate,
                createdBy: currentUser.id,
                assigneeIds: [currentUser.id],
                createdAt: serverTimestamp(),
                activityLog: [initialLog],
            });
            handleCancelInline();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (task: CollabTask, newStatus: CollabTaskStatus) => {
        const label = statusConfig[newStatus].label;
        const activityLog = createLog(task, `mengubah status menjadi ${label}`);
        await updateCollabTask(task.id, { status: newStatus, listId: newStatus, activityLog });
    };

    const handleUpdateTaskData = async (task: CollabTask, data: Partial<CollabTask>, log: string) => {
        const activityLog = createLog(task, log);
        await updateCollabTask(task.id, { ...data, activityLog });
    };

    const handleDuplicateTask = async (task: CollabTask) => {
        const { id, ...rest } = task;
        try {
            const duplicationLog: CollabActivityLogEntry = {
                id: `log_${Date.now()}`,
                authorId: currentUser!.id,
                authorName: currentUser!.name,
                timestamp: new Date(),
                action: `menduplikasi tugas ini dari "${task.title}"`,
                type: 'activity'
            };

            await addCollabTask({
                ...rest,
                title: `${rest.title} (Salinan)`,
                createdAt: serverTimestamp(),
                activityLog: [duplicationLog]
            });
            toast({ title: "Tugas Diduplikasi" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menduplikasi", description: e.message });
        }
    };

    const handleDeleteRequest = (task: CollabTask) => {
        setTaskToDelete(task);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete) return;
        setIsLoading(true);
        try {
            await deleteCollabTask(taskToDelete.id);
            toast({ title: "Tugas Dihapus", description: `Tugas "${taskToDelete.title}" telah dihapus.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menghapus", description: e.message });
        } finally {
            setTaskToDelete(null);
            setIsDeleteDialogOpen(false);
            setIsLoading(false);
        }
    };

    const handleAddList = async () => {
        if (!newListTitle.trim()) return;
        setIsLoading(true);
        try {
            const newList: CollabSpaceList = {
                id: `list_${Date.now()}`,
                title: newListTitle.trim()
            };
            const updatedLists = [...activeLists, newList];
            await updateCollabSpace(space.id, { lists: updatedLists });
            setNewListTitle("");
            setIsAddingList(false);
            toast({ title: "List Baru Ditambahkan" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menambah list", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteListRequest = (list: CollabSpaceList) => {
        setListToDelete(list);
        setIsDeleteListDialogOpen(true);
    };

    const handleConfirmDeleteList = async () => {
        if (!listToDelete) return;
        
        setIsLoading(true);
        try {
            const updatedLists = activeLists.filter(l => l.id !== listToDelete.id);
            await updateCollabSpace(space.id, { lists: updatedLists });

            const tasksInList = tasksByList[listToDelete.id] || [];
            if (tasksInList.length > 0) {
                await Promise.all(tasksInList.map(t => deleteCollabTask(t.id)));
            }

            toast({ title: "List Dihapus", description: "List dan tugas di dalamnya telah berhasil dihapus." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal menghapus list", description: e.message });
        } finally {
            setListToDelete(null);
            setIsDeleteListDialogOpen(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-4 animate-fade-in relative h-full">
            <div className="flex justify-between items-center px-1 shrink-0">
                <div className="flex items-center gap-2 text-primary">
                    <Briefcase className="h-4 w-4" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Kolaborasi Proyek</h2>
                </div>
            </div>

            <div className="flex-1 w-full overflow-y-auto">
                <div className="flex flex-wrap gap-6 pb-10 items-start px-1">
                    {activeLists.map((list) => {
                        const listTasks = tasksByList[list.id] || [];
                        const config = statusConfig[list.id as CollabTaskStatus] || { 
                            label: list.title, 
                            color: 'bg-slate-400', 
                            icon: Circle 
                        };

                        return (
                            <div 
                                key={list.id}
                                className="flex flex-col w-full md:w-[300px] shrink-0 md:shrink bg-secondary/20 rounded-xl border border-border/40 h-fit max-h-[600px] overflow-hidden"
                            >
                                <div className="flex items-center justify-between p-3 pb-1 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <config.icon className={cn("h-3 w-3", list.id === 'cancelled' ? 'text-red-500' : list.id === 'done' ? 'text-green-500' : 'text-foreground')} />
                                        <h3 className="font-black text-[10px] uppercase tracking-wider text-muted-foreground truncate max-w-[180px]">{list.title}</h3>
                                        <span className="text-[10px] font-bold opacity-40">({listTasks.length})</span>
                                    </div>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-100">
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel className="text-[10px] uppercase opacity-60 font-black">Opsi List</DropdownMenuLabel>
                                            <DropdownMenuItem onSelect={() => handleOpenInlineForm(list.id)} className="text-xs">
                                                <Plus className="mr-2 size-3" /> Tambah Tugas Proyek
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onSelect={() => handleDeleteListRequest(list)} 
                                                className="text-xs text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-3" /> Hapus List
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {listTasks.map(task => (
                                            <TaskCard 
                                                key={task.id} 
                                                task={task} 
                                                isSelected={selectedTaskIds.has(task.id)}
                                                onToggleSelect={handleToggleSelect}
                                                onOpenDetail={(t) => setSelectedTaskIdForDetail(t.id)}
                                                onUpdateStatus={handleUpdateStatus}
                                                onUpdateTask={handleUpdateTaskData}
                                                onDuplicate={handleDuplicateTask}
                                                onDeleteRequest={handleDeleteRequest}
                                            />
                                        ))}

                                        {addingToStatus === list.id && (
                                            <div className="p-3 bg-muted/50 rounded-xl border-2 border-primary/30 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                <Input 
                                                    placeholder="Nama tugas proyek" 
                                                    className="bg-background border-primary/20 h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if(e.key === 'Enter') handleCreateTask(list.id);
                                                        if(e.key === 'Escape') handleCancelInline();
                                                    }}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Switch 
                                                        id={`private-${list.id}`} 
                                                        checked={isPrivate} 
                                                        onCheckedChange={setIsPrivate} 
                                                        className="scale-75 origin-left"
                                                    />
                                                    <Label htmlFor={`private-${list.id}`} className="text-[10px] font-bold text-muted-foreground cursor-pointer">Tugas Rahasia</Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] h-8"
                                                        onClick={() => handleCreateTask(list.id)}
                                                        disabled={isLoading || !newTaskTitle.trim()}
                                                    >
                                                        {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                                                        Buat Tugas
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 hover:bg-muted-foreground/10"
                                                        onClick={handleCancelInline}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-2 pt-0 mt-auto shrink-0">
                                    {addingToStatus !== list.id && (
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-start text-muted-foreground hover:text-foreground text-[10px] h-7 font-bold hover:bg-background/50 rounded-lg"
                                            onClick={() => handleOpenInlineForm(list.id)}
                                        >
                                            <Plus className="mr-1.5 h-3 w-3" /> Tambah Tugas
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    <div className="w-full md:w-[300px] shrink-0 md:shrink">
                        {isAddingList ? (
                            <Card className="bg-secondary/20 p-3 rounded-xl border border-primary/30 space-y-3">
                                <Input 
                                    placeholder="Masukkan judul list..." 
                                    className="bg-background h-9 text-xs font-bold"
                                    value={newListTitle}
                                    onChange={(e) => setNewListTitle(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') handleAddList();
                                        if(e.key === 'Escape') setIsAddingList(false);
                                    }}
                                />
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        className="font-bold text-[10px] h-8"
                                        onClick={handleAddList}
                                        disabled={isLoading || !newListTitle.trim()}
                                    >
                                        {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                                        Tambah List
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => setIsAddingList(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <Button 
                                variant="outline" 
                                className="w-full h-10 border-dashed border-2 bg-muted/10 text-muted-foreground hover:bg-muted/30 font-bold text-[10px] rounded-xl flex justify-center items-center gap-2"
                                onClick={() => setIsAddingList(true)}
                            >
                                <Plus className="size-3" /> List Baru
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {selectedTaskIds.size > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-full duration-300">
                    <Card className="bg-primary text-primary-foreground shadow-2xl rounded-full px-6 py-2 flex items-center gap-6 border-none">
                        <div className="flex items-center gap-2 border-r border-primary-foreground/20 pr-6">
                            <CheckCircle2 className="size-5" />
                            <span className="text-sm font-black whitespace-nowrap">{selectedTaskIds.size} Tugas Dipilih</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold hover:bg-primary-foreground/10 text-primary-foreground">
                                        Pindah Status <ChevronDown className="ml-1.5 size-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-48">
                                    <DropdownMenuLabel className="text-[10px] uppercase">Pilih Status Baru</DropdownMenuLabel>
                                    {Object.entries(statusConfig).map(([status, config]) => (
                                        <DropdownMenuItem key={status} onSelect={() => handleBulkUpdateStatus(status as CollabTaskStatus)} className="text-xs">
                                            <config.icon className="mr-2 size-4" /> {config.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs font-bold hover:bg-red-500/20 text-red-200"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="mr-1.5 size-3" /> Hapus Semua
                            </Button>

                            <Separator orientation="vertical" className="h-4 bg-primary-foreground/20" />

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full hover:bg-primary-foreground/10 text-primary-foreground"
                                onClick={() => setSelectedTaskIds(new Set())}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <TaskDetailDialog 
                isOpen={!!selectedTaskIdForDetail}
                onOpenChange={(open) => !open && setSelectedTaskIdForDetail(null)}
                taskId={selectedTaskIdForDetail}
                space={space}
            />

            <DeleteConfirmationDialog 
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                itemName={taskToDelete?.title || ''}
                itemType="tugas"
            />

            <DeleteConfirmationDialog 
                isOpen={isDeleteListDialogOpen}
                onOpenChange={setIsDeleteListDialogOpen}
                onConfirm={handleConfirmDeleteList}
                itemName={listToDelete?.title || ''}
                itemType="list"
            />
        </div>
    );
}
