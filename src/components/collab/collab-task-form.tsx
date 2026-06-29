// src/components/collab/collab-task-form.tsx
"use client";

import { useEffect, useMemo } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { CollabTask, CollabSpace, CollabTaskStatus, CollabTaskPriority } from '@/types';
import { serverTimestamp } from 'firebase/firestore';

const taskSchema = z.object({
  title: z.string().min(1, "Judul tugas harus diisi."),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['todo', 'in-progress', 'done', 'cancelled']).default('todo'),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CollabTaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  space: CollabSpace;
  task?: CollabTask;
}

export function CollabTaskForm({ isOpen, onOpenChange, space, task }: CollabTaskFormProps) {
  const { employees, addCollabTask, updateCollabTask } = useMasterData();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', assigneeId: '', priority: 'medium', status: 'todo', dueDate: '' }
  });

  useEffect(() => {
    if (isOpen) {
      if (task) {
        const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : (task.dueDate ? new Date(task.dueDate) : null);
        form.reset({
          title: task.title,
          description: task.description || '',
          assigneeId: task.assigneeId || '',
          priority: task.priority,
          status: task.status,
          dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
        });
      } else {
        form.reset({ title: '', description: '', assigneeId: '', priority: 'medium', status: 'todo', dueDate: '' });
      }
    }
  }, [isOpen, task, form]);

  const assigneeOptions = useMemo(() => {
    return employees.filter(e => space.memberIds.includes(e.id));
  }, [employees, space.memberIds]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!currentUser) return;
    const assignee = employees.find(e => e.id === data.assigneeId);
    
    try {
        if (task) {
            await updateCollabTask(task.id, {
                ...data,
                assigneeName: assignee?.name || '',
            });
            toast({ title: "Tugas Diperbarui" });
        } else {
            await addCollabTask({
                ...data,
                spaceId: space.id,
                company: space.company,
                assigneeName: assignee?.name || '',
                createdBy: currentUser.id,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Tugas Berhasil Ditambahkan" });
        }
        onOpenChange(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SheetHeader>
              <SheetTitle>{task ? 'Ubah Tugas' : 'Tambah Tugas Baru'}</SheetTitle>
              <SheetDescription>Berikan rincian tugas untuk dikerjakan oleh tim.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Tugas</FormLabel>
                    <FormControl><Input placeholder="cth., Buat draf pengumuman..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl><Textarea placeholder="Detail instruksi..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ditugaskan Kepada</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih anggota tim..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="none">Tanpa Penugasan</SelectItem>
                            {assigneeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Prioritas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="low">Rendah</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="high">Tinggi</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tenggat Waktu</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Awal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="todo">To Do List</SelectItem>
                            <SelectItem value="in-progress">Dikerjakan</SelectItem>
                            <SelectItem value="done">Selesai</SelectItem>
                            <SelectItem value="cancelled">Batal</SelectItem>
                        </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
              <SheetClose asChild><Button variant="outline">Batal</Button></SheetClose>
              <Button type="submit">Simpan Tugas</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
