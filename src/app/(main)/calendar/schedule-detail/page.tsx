// src/app/(main)/calendar/schedule-detail/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Info, Users, Tag, Edit, X, Lock } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';

export default function ScheduleDetailPage() {
  const router = useRouter();
  const isLocked = true; // Dummy state for visual simulation

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rapat Koordinasi Tim Sales</CardTitle>
            {isLocked ? (
                <Badge variant="destructive"><Lock className="mr-2 h-3 w-3"/> Terkunci</Badge>
            ) : (
                <Badge variant="outline">Jadwal Internal</Badge>
            )}
          </div>
          <CardDescription>Detail jadwal untuk tim Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center gap-4 text-sm">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">Jumat, 8 November 2024</p>
              <p className="text-muted-foreground">10:00 - 11:00 WIB</p>
            </div>
          </div>
          <div className="flex items-start gap-4 text-sm">
            <Info className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <p className="font-semibold">Deskripsi</p>
              <p className="text-muted-foreground">
                Pembahasan progres mingguan, kendala di lapangan, dan strategi untuk minggu depan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">Peserta</p>
              <p className="text-muted-foreground">Seluruh anggota Departemen Sales & Marketing</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-start gap-2 pt-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <span tabIndex={0}>
                            <Button disabled={isLocked} onClick={() => router.push('/calendar/team-schedule')}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Jadwal
                            </Button>
                         </span>
                    </TooltipTrigger>
                    {isLocked && (
                        <TooltipContent>
                            <p>Tidak dapat mengedit karena jadwal terkunci oleh event global.</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" onClick={() => router.back()}>
                <X className="mr-2 h-4 w-4" /> Tutup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
