// src/app/(main)/test-notifications/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Bot, Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { triggerJob } from '@/lib/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MultiSelect, type OptionType } from '@/components/ui/multi-select';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function TestNotificationsPage() {
    const { userRole } = useAuth();
    const { employees, notificationTemplates } = useMasterData();
    const [log, setLog] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // State for filters
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');


    const employeeOptions: OptionType[] = useMemo(() => employees.map(e => ({ label: e.name, value: e.id })), [employees]);

    const getFinalTargetEmployeeIds = (): string[] | null => {
        if (selectedEmployees.length > 0) {
            return selectedEmployees;
        }
        return null;
    };


    const handleRunJob = async () => {
        setIsLoading(true);
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Memulai eksekusi job notifikasi...`]);
        
        const targetEmployeeIds = getFinalTargetEmployeeIds();
        const templateIdToSend = selectedTemplateId || null;

        if (!targetEmployeeIds || !templateIdToSend) {
            setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] GAGAL: Harap pilih karyawan dan template untuk mode tes.`]);
            setIsLoading(false);
            return;
        }

        const result = await triggerJob(targetEmployeeIds, templateIdToSend);
        if (result.success) {
            setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] SUKSES: ${result.data.message}`]);
        } else {
            setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] GAGAL: ${result.data.error}`]);
        }
        setIsLoading(false);
    };

    if (userRole !== 'superadmin') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Akses Ditolak</CardTitle>
                    <CardDescription>Hanya Superadmin yang dapat mengakses halaman ini.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Halaman Tes Notifikasi</CardTitle>
                    <CardDescription>
                        Jalankan proses pengiriman notifikasi secara manual untuk target spesifik.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-6">
                        <h4 className="font-semibold text-sm">Filter Penargetan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <Label>Karyawan (Pilih satu atau lebih)</Label>
                                <MultiSelect options={employeeOptions} value={selectedEmployees} onChange={setSelectedEmployees} placeholder="Pilih Karyawan..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Template Notifikasi</Label>
                                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih template untuk dikirim" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {notificationTemplates.map(template => (
                                            <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                     </div>
                     <Alert variant="destructive" className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Perhatian!</AlertTitle>
                        <AlertDescription>
                            Aksi ini akan mengirimkan email notifikasi **NYATA** ke pengguna yang ditargetkan. Pastikan Anda sudah siap.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleRunJob} disabled={isLoading || !selectedEmployees.length || !selectedTemplateId}>
                        <Send className="mr-2 h-4 w-4" />
                        {isLoading ? 'Menjalankan...' : 'Jalankan & Kirim Notifikasi'}
                    </Button>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Log Eksekusi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs space-y-1">
                        {log.length === 0 ? (
                            <p className="text-muted-foreground">Log akan muncul di sini setelah Anda menjalankan job.</p>
                        ) : (
                            log.map((line, index) => <p key={index}>{line}</p>)
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
