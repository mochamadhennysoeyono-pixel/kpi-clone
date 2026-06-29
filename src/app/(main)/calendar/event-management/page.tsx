// src/app/(main)/calendar/event-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Building, Save, Globe, Trash2, Users, Clock, ArrowLeft, Tag, Video, MapPin } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterData } from "@/contexts/master-data-context";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EventManagementPage() {
  const router = useRouter();
  const { companies, departments, positions, employees } = useMasterData();
  const isEventActive = true; // Dummy state for visual simulation
  const isEventLocked = false; // Dummy state for visual simulation
  const [eventType, setEventType] = useState('rapat_acara_internal');
  const [targetType, setTargetType] = useState('global');
  const [meetingType, setMeetingType] = useState('online');

  // State for specific targeting (multi-select)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const handleSave = () => {
    router.push('/calendar/event-detail');
  };
  
  const showSystemImpact = ['system_deadline', 'performance_cycle', 'learning_cycle'].includes(eventType);
  const showMeetingLocation = eventType === 'rapat_acara_internal';

  // --- Filter options for specific targeting (multi-select aware) ---
  const companyOptions = useMemo(() => {
    return companies.map(c => ({ label: c.name, value: c.id }));
  }, [companies]);

  const departmentOptions = useMemo(() => {
    if (selectedCompanies.length === 0) return [];
    const selectedCompanyNames = companies.filter(c => selectedCompanies.includes(c.id)).map(c => c.name);
    return departments.filter(d => selectedCompanyNames.includes(d.company)).map(d => ({label: d.name, value: d.id}));
  }, [departments, selectedCompanies, companies]);

  const positionOptions = useMemo(() => {
    if (selectedCompanies.length === 0) return [];
    const selectedCompanyNames = companies.filter(c => selectedCompanies.includes(c.id)).map(c => c.name);
    const selectedDepartmentNames = departments.filter(d => selectedDepartments.includes(d.id)).map(d => d.name);

    return positions.filter(p => 
      selectedCompanyNames.includes(p.company) &&
      (selectedDepartments.length === 0 || selectedDepartmentNames.includes(p.department))
    ).map(p => ({label: p.name, value: p.id}));
  }, [positions, selectedCompanies, selectedDepartments, companies, departments]);

  const employeeOptions = useMemo(() => {
    if (selectedCompanies.length === 0) return [];
    const selectedCompanyNames = companies.filter(c => selectedCompanies.includes(c.id)).map(c => c.name);
    const selectedDepartmentNames = departments.filter(d => selectedDepartments.includes(d.id)).map(d => d.name);
    const selectedPositionNames = positions.filter(p => selectedPositions.includes(p.id)).map(p => p.name);

    return employees.filter(e => 
      selectedCompanyNames.includes(e.company) &&
      (selectedDepartments.length === 0 || selectedDepartmentNames.includes(e.department)) &&
      (selectedPositions.length === 0 || selectedPositionNames.includes(e.position))
    ).map(e => ({label: e.name, value: e.id}));
  }, [employees, selectedCompanies, selectedDepartments, selectedPositions, companies, departments, positions]);

  // Reset dependent filters when a higher-level filter changes
  const handleCompanyChange = (companyIds: string[]) => {
    setSelectedCompanies(companyIds);
    setSelectedDepartments([]);
    setSelectedPositions([]);
    setSelectedEmployees([]);
  };
  
  const handleDepartmentChange = (departmentIds: string[]) => {
    setSelectedDepartments(departmentIds);
    setSelectedPositions([]);
    setSelectedEmployees([]);
  };

  const handlePositionChange = (positionIds: string[]) => {
    setSelectedPositions(positionIds);
    setSelectedEmployees([]);
  };


  return (
    <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kalender
        </Button>
        <Card className="shadow-lg">
             <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="font-headline text-2xl">Buat Event Organisasi Baru</CardTitle>
                    {isEventActive && <Badge>Sedang Berjalan</Badge>}
                </div>
                <CardDescription>Definisikan jadwal, target, dan dampak sistemik dari event ini.</CardDescription>
                {isEventActive && !isEventLocked && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <AlertTitle>Event Sedang Berjalan</AlertTitle>
                        <AlertDescription>
                            Perubahan pada event ini akan berdampak langsung pada sistem. Harap berhati-hati.
                        </AlertDescription>
                    </Alert>
                )}
                {isEventLocked && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Event Terkunci</AlertTitle>
                        <AlertDescription>
                            Event ini telah selesai atau terkunci dan tidak dapat diubah lagi.
                        </AlertDescription>
                    </Alert>
                )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
                <div className="space-y-8">
                    {/* Section 1: Properti Event */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">1. Properti Event</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="eventName">Nama Event</Label>
                                    <Input id="eventName" placeholder="cth., Siklus Penilaian Kinerja Q4 2024" disabled={isEventLocked} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eventType">Jenis Event</Label>
                                    <Select value={eventType} onValueChange={setEventType} disabled={isEventLocked}>
                                        <SelectTrigger id="eventType"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rapat_acara_internal">Rapat / Acara Internal</SelectItem>
                                            <SelectItem value="system_deadline">Deadline Sistem</SelectItem>
                                            <SelectItem value="performance_cycle">Siklus Penilaian Kinerja</SelectItem>
                                            <SelectItem value="learning_cycle">Siklus Pembelajaran (LMS)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eventDescription">Deskripsi</Label>
                                <Textarea id="eventDescription" placeholder="Jelaskan tujuan dan konteks dari event ini..." disabled={isEventLocked} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">Tanggal & Waktu Mulai</Label>
                                    <Input id="startDate" type="datetime-local" disabled={isEventLocked} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">Tanggal & Waktu Selesai</Label>
                                    <Input id="endDate" type="datetime-local" disabled={isEventLocked} />
                                </div>
                            </div>
                            {showMeetingLocation && (
                                <div className="space-y-4 pt-4 border-t">
                                    <Label>Lokasi Acara</Label>
                                    <RadioGroup value={meetingType} onValueChange={setMeetingType} className="grid grid-cols-2 gap-4" disabled={isEventLocked}>
                                        <div className="relative">
                                          <RadioGroupItem value="online" id="online" className="peer sr-only" />
                                          <Label htmlFor="online" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                              <Video className="mb-3 h-6 w-6" />
                                              Online
                                          </Label>
                                        </div>
                                        <div className="relative">
                                          <RadioGroupItem value="offline" id="offline" className="peer sr-only" />
                                          <Label htmlFor="offline" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                              <MapPin className="mb-3 h-6 w-6" />
                                              Offline
                                          </Label>
                                        </div>
                                    </RadioGroup>
                                    {meetingType === 'online' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="meetingLink">Link Rapat Online</Label>
                                            <Input id="meetingLink" placeholder="https://meet.google.com/..." disabled={isEventLocked} />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="meetingLocation">Alamat / Lokasi</Label>
                                            <Input id="meetingLocation" placeholder="cth., Ruang Rapat Andromeda, Lt. 5" disabled={isEventLocked} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="finalDeadline">Deadline Final (Hard Lock)</Label>
                                <Input id="finalDeadline" type="datetime-local" disabled={isEventLocked} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Section 2: Konfigurasi Target */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">2. Konfigurasi Target</h3>
                        <RadioGroup value={targetType} onValueChange={setTargetType} className="space-y-2" disabled={isEventLocked}>
                            <div className="flex items-center space-x-2 rounded-md border p-4">
                                <RadioGroupItem value="global" id="target-global" />
                                <Label htmlFor="target-global" className="flex items-center gap-2 font-medium cursor-pointer">
                                    <Globe className="h-5 w-5" /> Berlaku untuk Semua Perusahaan (Global)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 rounded-md border p-4">
                                <RadioGroupItem value="specific" id="target-specific" />
                                <Label htmlFor="target-specific" className="flex items-center gap-2 font-medium cursor-pointer">
                                    <Building className="h-5 w-5" /> Pilih Perusahaan / Grup Tertentu
                                </Label>
                            </div>
                        </RadioGroup>

                        {targetType === 'specific' && (
                            <div className="pl-6 pt-4 border-l-2 ml-3 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MultiSelect
                                        options={companyOptions}
                                        value={selectedCompanies}
                                        onChange={handleCompanyChange}
                                        placeholder="Pilih Perusahaan..."
                                        disabled={isEventLocked}
                                    />
                                <MultiSelect
                                        options={departmentOptions}
                                        value={selectedDepartments}
                                        onChange={handleDepartmentChange}
                                        placeholder="Pilih Departemen..."
                                        disabled={selectedCompanies.length === 0 || isEventLocked}
                                    />
                                    <MultiSelect
                                        options={positionOptions}
                                        value={selectedPositions}
                                        onChange={handlePositionChange}
                                        placeholder="Pilih Jabatan..."
                                        disabled={selectedCompanies.length === 0 || isEventLocked}
                                    />
                                    <MultiSelect
                                        options={employeeOptions}
                                        value={selectedEmployees}
                                        onChange={setSelectedEmployees}
                                        placeholder="Pilih Karyawan..."
                                        disabled={selectedCompanies.length === 0 || isEventLocked}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Kosongkan filter untuk menargetkan semua entitas di level tersebut (misalnya, pilih perusahaan tapi kosongkan departemen untuk menargetkan seluruh perusahaan).</p>
                            </div>
                        )}
                    </div>
                    
                    {showSystemImpact && <Separator />}

                    {/* Section 3: Konfigurasi Dampak Sistem (Conditional) */}
                    {showSystemImpact && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">3. Konfigurasi Dampak Sistem</h3>
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Perhatian!</AlertTitle>
                                <AlertDescription>
                                    Pengaturan ini akan mengunci atau membuka fitur secara otomatis di seluruh sistem yang ditargetkan. Harap konfigurasikan dengan hati-hati.
                                </AlertDescription>
                            </Alert>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Kunci Input KPI</Label>
                                        <p className="text-sm text-muted-foreground">Mencegah user menginput/mengubah data KPI.</p>
                                    </div>
                                    <Switch defaultChecked={true} disabled={isEventLocked} />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Buka Approval Laporan</Label>
                                        <p className="text-sm text-muted-foreground">Mengizinkan atasan untuk menyetujui laporan.</p>
                                    </div>
                                    <Switch defaultChecked={false} disabled={isEventLocked} />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Mulai Siklus Appraisal</Label>
                                        <p className="text-sm text-muted-foreground">Mengaktifkan modul penilaian KBO.</p>
                                    </div>
                                    <Switch defaultChecked={true} disabled={isEventLocked} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="destructive" disabled={isEventLocked}><Trash2 className="mr-2 h-4 w-4"/> Hapus</Button>
                <Button variant="outline" disabled={isEventLocked} onClick={handleSave}>Simpan sebagai Draf</Button>
                <Button disabled={isEventLocked} onClick={handleSave}><Save className="mr-2 h-4 w-4"/> Publikasikan Event</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
