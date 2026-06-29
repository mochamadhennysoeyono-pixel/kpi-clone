// src/components/kpi/bulk-input-section.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parse, eachMonthOfInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Download, Upload } from 'lucide-react';
import type { KpiData, KpiSetup, Employee, PerformanceStatus, KpiIndicator } from '@/types';

const getCycleDivider = (cycle: KpiIndicator['cycle']): number => {
    switch(cycle) {
        case 'Bulanan': return 1;
        case '3 Bulan': return 3;
        case '6 Bulan': return 6;
        case '1 Tahun': return 12;
        default: return 1;
    }
}

export default function BulkInputSection() {
    const { currentUser, userRole } = useAuth();
    const { companies, employees, kpiSetups, addOrUpdateKpiData, fetchData } = useMasterData();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [startPeriod, setStartPeriod] = useState<Date | undefined>(new Date());
    const [endPeriod, setEndPeriod] = useState<Date | undefined>(new Date());
    const [isExporting, setIsExporting] = useState(false);


    useEffect(() => {
        if (userRole !== 'superadmin' && currentUser?.company) {
            setSelectedCompany(currentUser.company);
        }
    }, [currentUser, userRole]);
    
    const companyOptions = useMemo(() => {
        if (userRole === 'superadmin') return companies;
        return companies.filter(c => c.name === currentUser?.company);
    }, [companies, currentUser, userRole]);

    const departmentOptions = useMemo(() => {
        if (!selectedCompany) return [];
        return [...new Set(kpiSetups.filter(s => s.company === selectedCompany).map(s => s.department))].filter(Boolean);
    }, [kpiSetups, selectedCompany]);

    const positionOptions = useMemo(() => {
        if (!selectedDepartment) return [];
        return [...new Set(kpiSetups.filter(s => s.company === selectedCompany && s.department === selectedDepartment).map(s => s.position))].filter(Boolean);
    }, [kpiSetups, selectedCompany, selectedDepartment]);

    const handleExport = async () => {
        if (!selectedCompany || !selectedDepartment || !selectedPosition || !startPeriod || !endPeriod) {
            toast({ variant: 'destructive', title: 'Filter Tidak Lengkap', description: 'Harap pilih semua filter sebelum mengunduh template.' });
            return;
        }
    
        const setup = kpiSetups.find(s => s.company === selectedCompany && s.department === selectedDepartment && s.position === selectedPosition && s.status === 'Aktif');
        if (!setup) {
             toast({ variant: 'destructive', title: 'Setup KPI Tidak Ditemukan', description: 'Tidak ada pengaturan KPI aktif untuk jabatan ini.' });
            return;
        }
    
        const filteredEmployees = employees.filter(e =>
            e.company === selectedCompany &&
            e.department === selectedDepartment &&
            e.position === selectedPosition &&
            e.status === 'Aktif'
        );
    
        if (filteredEmployees.length === 0) {
            toast({ variant: 'destructive', title: 'Karyawan Tidak Ditemukan', description: 'Tidak ada karyawan yang cocok dengan filter yang dipilih.' });
            return;
        }
        
        setIsExporting(true);
        const months = eachMonthOfInterval({ start: startPeriod, end: endPeriod });
    
        try {
            const response = await fetch('/api/export-kpi-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setup, employees: filteredEmployees, months }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal membuat file template Excel.');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Template_Pencapaian_${selectedPosition}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: 'Template Siap Diunduh', description: 'File template Excel telah berhasil dibuat.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Mengekspor', description: error.message });
        } finally {
            setIsExporting(false);
        }
    };
    

     const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const XLSX = await import('xlsx');
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData);
            
            let updatesCount = 0;
            const batchPromises: Promise<void>[] = [];

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                let currentEmployee: Employee | null = null;
                let setup: KpiSetup | null = null;

                const employeeIdRow = json.find(r => r[0] === 'Employee ID');
                const employeeId = employeeIdRow ? employeeIdRow[1] : null;

                if (!employeeId) continue;

                currentEmployee = employees.find(e => e.id === employeeId) || null;
                if (!currentEmployee) continue;

                setup = kpiSetups.find(s => s.company === currentEmployee!.company && s.department === currentEmployee!.department && s.position === currentEmployee!.position && s.status === 'Aktif') || null;

                if (!setup) continue;

                const headerRowIndex = json.findIndex(r => r[0] === 'No');
                if (headerRowIndex === -1) continue;

                const headers = json[headerRowIndex] as string[];
                const indicatorRows = json.slice(headerRowIndex + 1).filter(r => r.length > 1 && typeof r[0] === 'number');

                const periodHeaders = headers.filter(h => h && h.startsWith('Aktual'));
                
                for (const header of periodHeaders) {
                    const match = header.match(/Aktual \((.*)\)/);
                    if (!match) continue;

                    const monthStr = match[1];
                    const period = format(parse(monthStr, 'MMM yyyy', {locale: localeId}), 'yyyy-MM');

                    const kpiData: KpiData = {
                        id: `${currentEmployee!.id}_${period}`,
                        period, employeeId: currentEmployee!.id, employeeName: currentEmployee!.name,
                        company: currentEmployee!.company, department: currentEmployee!.department, position: currentEmployee!.position,
                        level: currentEmployee!.level, reportsTo: currentEmployee!.reportsTo,
                        score: 0, status: 'Perlu Peningkatan', achievements: [], approvalStatus: 'Menunggu Persetujuan'
                    };
                    
                    let totalScore = 0;
                    setup.indicators.forEach(indicator => {
                         const indicatorRow = indicatorRows.find(r => r[1] === indicator.indicator);
                         if (!indicatorRow) return;
                         
                         const actualColIndex = headers.indexOf(header);
                         const notesColIndex = headers.indexOf(`Keterangan (${monthStr})`);
                         
                         const actual = indicatorRow[actualColIndex] ? Number(indicatorRow[actualColIndex]) : 0;
                         const keterangan = indicatorRow[notesColIndex] || '';

                         kpiData.achievements.push({
                            indicatorId: indicator.id,
                            actual,
                            keterangan
                         });

                         const monthlyTarget = indicator.target / getCycleDivider(indicator.cycle);
                         const score = monthlyTarget > 0 ? Math.min((actual / monthlyTarget) * indicator.weight, indicator.weight) : 0;
                         totalScore += score;
                    });

                    kpiData.score = parseFloat(totalScore.toFixed(1));
                    const minAchievement = setup?.minAchievement ?? 70;
                    kpiData.status = totalScore >= minAchievement * 1.1 ? "Melampaui Target" : totalScore >= minAchievement ? "Mencapai Target" : "Perlu Peningkatan";
                    
                    batchPromises.push(addOrUpdateKpiData(kpiData));
                    updatesCount++;
                }
            }

            await Promise.all(batchPromises);
            await fetchData();
            
            toast({ title: 'Impor Selesai', description: `${updatesCount} data pencapaian berhasil diimpor.` });

        } catch (error) {
            console.error("Import failed:", error);
            toast({ variant: 'destructive', title: 'Impor Gagal', description: 'Terjadi kesalahan saat memproses file Anda.' });
        } finally {
            if (event.target) event.target.value = ''; // Reset file input
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Input Pencapaian Massal</CardTitle>
                <CardDescription>Unduh template Excel, isi data pencapaian, lalu unggah kembali untuk memperbarui data secara massal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger>
                        <SelectContent>{companyOptions.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={!selectedCompany}>
                        <SelectTrigger><SelectValue placeholder="Pilih Departemen" /></SelectTrigger>
                        <SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={!selectedDepartment}>
                        <SelectTrigger><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                        <SelectContent>{positionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <Label>Periode Mulai</Label>
                        <Input type="month" value={startPeriod ? format(startPeriod, 'yyyy-MM') : ''} onChange={e => setStartPeriod(e.target.value ? parse(e.target.value, 'yyyy-MM', new Date()) : undefined)} />
                     </div>
                      <div>
                        <Label>Periode Selesai</Label>
                        <Input type="month" value={endPeriod ? format(endPeriod, 'yyyy-MM') : ''} onChange={e => setEndPeriod(e.target.value ? parse(e.target.value, 'yyyy-MM', new Date()) : undefined)} />
                     </div>
                 </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row items-stretch sm:items-center gap-2">
                 <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto" disabled={isExporting}>
                    {isExporting ? 'Mengekspor...' : <><Download className="mr-2 h-4 w-4" /> Unduh Template</>}
                 </Button>
                 <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto"><Upload className="mr-2 h-4 w-4" /> Unggah File</Button>
                 <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" className="hidden" />
            </CardFooter>
        </Card>
    );
}
