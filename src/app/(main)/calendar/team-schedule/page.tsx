// src/app/(main)/calendar/team-schedule/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, Calendar, Clock, Info, Users, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useRouter } from 'next/navigation';

export default function TeamSchedulePage() {
    const router = useRouter();
    const isLocked = false; // Dummy state for simulation

    const handleSave = () => {
        router.push('/calendar');
    };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kalender
        </Button>
       <Card className="shadow-lg">
             <CardHeader>
                <CardTitle className="font-headline text-2xl">Buat Jadwal Tim</CardTitle>
                <CardDescription>Buat pengingat atau jadwal internal untuk tim Anda.</CardDescription>
                {isLocked && (
                    <Alert variant="destructive" className="mt-2">
                        <Lock className="h-4 w-4" />
                        <AlertTitle>Jadwal Terkunci</AlertTitle>
                        <AlertDescription>
                            Jadwal ini berada dalam periode event global dan tidak dapat diubah.
                        </AlertDescription>
                    </Alert>
                )}
            </CardHeader>
            <CardContent>
                <fieldset disabled={isLocked} className="space-y-6 group">
                    <div className="space-y-2 group-disabled:opacity-50">
                        <Label htmlFor="scheduleName">Nama Jadwal / Agenda</Label>
                        <Input id="scheduleName" placeholder="cth., Rapat Koordinasi Mingguan" />
                    </div>
                    <div className="space-y-2 group-disabled:opacity-50">
                        <Label htmlFor="scheduleDescription">Deskripsi</Label>
                        <Textarea id="scheduleDescription" placeholder="Jelaskan tujuan dari jadwal ini..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 group-disabled:opacity-50">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Waktu Mulai</Label>
                            <Input id="startDate" type="datetime-local" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Waktu Selesai</Label>
                            <Input id="endDate" type="datetime-local" />
                        </div>
                    </div>
                    <div className="space-y-3 group-disabled:opacity-50">
                        <Label>Target Peserta</Label>
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="team-sales"/>
                                <Label htmlFor="team-sales">Departemen Sales & Marketing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="team-it"/>
                                <Label htmlFor="team-it">Departemen IT</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="team-hr"/>
                                <Label htmlFor="team-hr">Departemen HR</Label>
                            </div>
                        </div>
                    </div>
                </fieldset>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="destructive" disabled={isLocked}><Trash2 className="mr-2 h-4 w-4"/> Hapus</Button>
                <Button disabled={isLocked} onClick={handleSave}><Save className="mr-2 h-4 w-4"/> Simpan Jadwal</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
