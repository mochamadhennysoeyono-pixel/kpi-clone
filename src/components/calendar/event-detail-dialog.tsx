// src/components/calendar/event-detail-dialog.tsx
"use client";

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, Briefcase, GitFork } from "lucide-react";
import type { CalendarEvent } from "@/app/(main)/calendar/page";
import type { KpiSetup } from '@/types';

interface EventDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  event: CalendarEvent | null;
}

export function EventDetailDialog({ isOpen, onOpenChange, event }: EventDetailDialogProps) {
  const groupedSources = useMemo(() => {
    if (!event) return [];

    const groups: { [key: string]: { company: string; departments: { [key: string]: string[] } } } = {};

    (event.sourceDocs as KpiSetup[]).forEach(setup => {
        if (!groups[setup.company]) {
            groups[setup.company] = {
                company: setup.company,
                departments: {},
            };
        }
        if (!groups[setup.company].departments[setup.department]) {
            groups[setup.company].departments[setup.department] = [];
        }
        if (!groups[setup.company].departments[setup.department].includes(setup.position)) {
            groups[setup.company].departments[setup.department].push(setup.position);
        }
    });

    return Object.values(groups);

  }, [event]);

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            Berikut adalah rincian semua grup yang terpengaruh oleh event ini.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] -mx-6">
            <ScrollArea className="h-full px-6">
                <div className="space-y-4 py-4">
                    {groupedSources.map(group => (
                        <div key={group.company} className="border rounded-lg">
                            <div className="p-3 bg-muted/50 font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground"/> {group.company}
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Departemen</TableHead>
                                        <TableHead>Jabatan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(group.departments).map(([dept, positions]) => (
                                        <TableRow key={dept}>
                                            <TableCell className="font-medium align-top">{dept}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {positions.map(pos => <Badge key={pos} variant="outline">{pos}</Badge>)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
