// src/components/kpi/kpi-bulk-actions.tsx
"use client";

import * as React from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import type { KpiSetup, Company } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { DEFAULT_KPI_CATEGORIES } from '@/lib/default-data';

interface KpiBulkActionsProps {
  filteredSetups: KpiSetup[];
}

export default function KpiBulkActions({ filteredSetups }: KpiBulkActionsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { addKpiSetup, fetchData, companies, departments, positions, kpiCategories } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  // Helper to determine the scope of managed companies
  const managedCompanyNames = React.useMemo(() => {
    if (!currentUser || !userRole) return [];
    if (userRole === 'superadmin') return companies.map(c => c.name);

    const userCompany = companies.find(c => c.name === currentUser.company);
    if (!userCompany) return [currentUser.company];

    if (userCompany.isHolding) {
      const getDescendantNames = (parentId: string): string[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [
          ...children.map(c => c.name),
          ...children.flatMap(c => getDescendantNames(c.id)),
        ];
      };
      return [userCompany.name, ...getDescendantNames(userCompany.id)];
    }

    return [userCompany.name];
  }, [companies, currentUser, userRole]);

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const dataToExport = filteredSetups.flatMap(setup => 
        setup.indicators.map(indicator => ({
            'Perusahaan': setup.company,
            'Departemen': setup.department,
            'Jabatan': setup.position,
            'Level Jabatan': setup.level,
            'Berlaku Dari (yyyy-mm)': setup.validFrom,
            'Berlaku Sampai (yyyy-mm)': setup.validTo,
            'Min Pencapaian (%)': setup.minAchievement,
            'Deadline Pengisian': setup.kpiInputDeadline?.type === 'specific_date' 
                ? `Tanggal ${setup.kpiInputDeadline.value}` 
                : setup.kpiInputDeadline?.type === 'last_day' 
                ? 'Akhir Bulan' 
                : `H${setup.kpiInputDeadline?.value || 0}`,
            'Status Setup': setup.status,
            'Kategori Indikator': indicator.category,
            'Nama Indikator': indicator.indicator,
            'Cara Ukur': indicator.measurement,
            'Siklus Penilaian': indicator.cycle,
            'Target (Siklus)': indicator.target,
            'Format Target': indicator.targetFormat,
            'Satuan': indicator.unit,
            'Bobot (%)': indicator.weight,
            'Metode Hitung': indicator.calculationMethod || 'Target Maksimal',
        }))
    );

    if (dataToExport.length === 0) {
        toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data pengaturan KPI untuk diekspor." });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pengaturan KPI");

    XLSX.writeFile(workbook, `Ekspor_Setup_KPI_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
        title: "Ekspor Berhasil",
        description: "Data pengaturan KPI telah berhasil diekspor ke file Excel.",
    });
  };

  const handleDownloadExample = async () => {
    setIsExporting(true);
    try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const mainSheet = workbook.addWorksheet('PENGATURAN KPI');
        const masterSheet = workbook.addWorksheet('MASTER DATA');

        // 1. Filter Master Data based on the user's scope
        const scopedCompanies = companies.filter(c => managedCompanyNames.includes(c.name));
        const scopedDepts = departments.filter(d => managedCompanyNames.includes(d.company));
        const scopedPos = positions.filter(p => managedCompanyNames.includes(p.company));
        const scopedCats = [
            ...DEFAULT_KPI_CATEGORIES.map(c => c.name),
            ...kpiCategories.filter(c => managedCompanyNames.includes(c.company)).map(c => c.name)
        ];

        // Prepare lists for dropdowns
        const companiesList = scopedCompanies.map(c => c.name);
        const deptsList = [...new Set(scopedDepts.map(d => d.name))];
        const posList = [...new Set(scopedPos.map(p => p.name))];
        const levelsList = ['Staff', 'Supervisor', 'Manager', 'Direktur'];
        const catsList = [...new Set(scopedCats)];
        const cyclesList = ['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun'];
        const methodsList = ['Target Maksimal', 'Target Minimal', 'Target Mutlak', 'Target Limit'];
        const statusList = ['Aktif', 'Tidak Aktif'];
        const formatList = ['Numerik', 'Persentase'];

        // 2. Setup Master Data Sheet (Hidden or Background)
        masterSheet.columns = [
            { header: 'Perusahaan', key: 'company' },
            { header: 'Departemen', key: 'dept' },
            { header: 'Jabatan', key: 'pos' },
            { header: 'Level', key: 'level' },
            { header: 'Kategori', key: 'cat' },
            { header: 'Siklus', key: 'cycle' },
            { header: 'Metode', key: 'method' },
            { header: 'Status', key: 'status' },
            { header: 'Format', key: 'format' },
        ];

        const maxRows = Math.max(
            companiesList.length, deptsList.length, posList.length, 
            levelsList.length, catsList.length, cyclesList.length, 
            methodsList.length, statusList.length, formatList.length
        );

        for (let i = 0; i < maxRows; i++) {
            masterSheet.addRow({
                company: companiesList[i] || '',
                dept: deptsList[i] || '',
                pos: posList[i] || '',
                level: levelsList[i] || '',
                cat: catsList[i] || '',
                cycle: cyclesList[i] || '',
                method: methodsList[i] || '',
                status: statusList[i] || '',
                format: formatList[i] || '',
            });
        }

        // 3. Setup Main Input Sheet Headers
        const headers = [
            'Perusahaan', 'Departemen', 'Jabatan', 'Level Jabatan', 'Berlaku Dari (yyyy-mm)', 'Berlaku Sampai (yyyy-mm)', 
            'Min Pencapaian (%)', 'Deadline Pengisian', 'Status Setup', 'Kategori Indikator', 'Nama Indikator', 
            'Cara Ukur', 'Siklus Penilaian', 'Target (Siklus)', 'Format Target', 'Satuan', 'Bobot (%)', 'Metode Hitung'
        ];
        mainSheet.addRow(headers);
        mainSheet.getRow(1).font = { bold: true };
        mainSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        // Add an example row for guidance
        mainSheet.addRow([
            companiesList[0] || 'PT Contoh', 
            deptsList[0] || 'Sales', 
            posList[0] || 'Account Manager', 
            'Staff', 
            '2025-01', 
            '2025-12', 
            70, 
            '25', 
            'Aktif', 
            'Financial', 
            'Omset Penjualan', 
            'Total invoice terbayar', 
            'Bulanan', 
            1000000000, 
            'Numerik', 
            'Rupiah', 
            40, 
            'Target Maksimal'
        ]);

        // 4. Apply Data Validation (Dropdowns) for rows 2 to 200
        for (let i = 2; i <= 200; i++) {
            const row = mainSheet.getRow(i);
            
            // Perusahaan (Col A)
            if (companiesList.length > 0) {
                row.getCell(1).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$A$2:$A$${companiesList.length + 1}`] };
            }
            // Departemen (Col B)
            if (deptsList.length > 0) {
                row.getCell(2).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$B$2:$B$${deptsList.length + 1}`] };
            }
            // Jabatan (Col C)
            if (posList.length > 0) {
                row.getCell(3).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$C$2:$C$${posList.length + 1}`] };
            }
            // Level (Col D)
            row.getCell(4).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$D$2:$D$${levelsList.length + 1}`] };
            // Status (Col I)
            row.getCell(9).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$H$2:$H$${statusList.length + 1}`] };
            // Kategori (Col J)
            if (catsList.length > 0) {
                row.getCell(10).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$E$2:$E$${catsList.length + 1}`] };
            }
            // Siklus (Col M)
            row.getCell(13).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$F$2:$F$${cyclesList.length + 1}`] };
            // Format (Col O)
            row.getCell(15).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$I$2:$I$${formatList.length + 1}`] };
            // Metode (Col R)
            row.getCell(18).dataValidation = { type: 'list', allowBlank: true, formulae: [`'MASTER DATA'!$G$2:$G$${methodsList.length + 1}`] };
        }

        // Auto-fit columns
        mainSheet.columns.forEach(column => {
            column.width = 25;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Template_Setup_KPI_${currentUser?.company || 'Admin'}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({ title: "Template Cerdas Diunduh", description: "Data referensi telah disesuaikan dengan profil perusahaan Anda." });
    } catch (error: any) {
        console.error("Error generating template:", error);
        toast({ variant: 'destructive', title: "Gagal Mengunduh", description: "Terjadi kesalahan saat membuat file template." });
    } finally {
        setIsExporting(false);
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const XLSX = await import('xlsx');
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData);
        const worksheet = workbook.Sheets['PENGATURAN KPI'] || workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Group rows by setup unique criteria
        const setupGroups = new Map<string, any[]>();
        
        jsonData.forEach(row => {
            const key = `${row['Perusahaan']}|${row['Departemen']}|${row['Jabatan']}|${row['Level Jabatan']}|${row['Berlaku Dari (yyyy-mm)']}|${row['Berlaku Sampai (yyyy-mm)']}`;
            if (!setupGroups.has(key)) setupGroups.set(key, []);
            setupGroups.get(key)!.push(row);
        });

        let successCount = 0;
        let errorCount = 0;

        for (const [key, rows] of Array.from(setupGroups.entries())) {
            const firstRow = rows[0];
            
            // Basic validation
            if (!firstRow['Perusahaan'] || !firstRow['Jabatan']) continue;

            // Parse deadline
            let deadline: any = { type: 'specific_date', value: 25 };
            const deadlineStr = String(firstRow['Deadline Pengisian'] || '');
            if (deadlineStr.toLowerCase().includes('akhir bulan')) {
                deadline = { type: 'last_day' };
            } else if (deadlineStr.startsWith('H')) {
                deadline = { type: 'relative_to_end', value: parseInt(deadlineStr.substring(1)) || 0 };
            } else {
                const match = deadlineStr.match(/\d+/);
                if (match) deadline = { type: 'specific_date', value: parseInt(match[0]) };
            }

            const setupPayload: Omit<KpiSetup, 'id'> = {
                company: firstRow['Perusahaan'],
                department: firstRow['Departemen'],
                position: firstRow['Jabatan'],
                level: firstRow['Level Jabatan'] as any,
                validFrom: String(firstRow['Berlaku Dari (yyyy-mm)']),
                validTo: String(firstRow['Berlaku Sampai (yyyy-mm)']),
                minAchievement: parseInt(firstRow['Min Pencapaian (%)']) || 70,
                kpiInputDeadline: deadline,
                status: firstRow['Status Setup'] === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
                description: `Impor massal pada ${new Date().toLocaleDateString()}`,
                indicators: rows.map((r, i) => ({
                    id: `IND-IMP-${Date.now()}-${i}`,
                    category: r['Kategori Indikator'],
                    indicator: r['Nama Indikator'],
                    measurement: r['Cara Ukur'],
                    cycle: r['Siklus Penilaian'] as any,
                    target: parseFloat(r['Target (Siklus)']) || 0,
                    targetFormat: r['Format Target'] as any,
                    unit: r['Satuan'],
                    weight: parseFloat(r['Bobot (%)']) || 0,
                    calculationMethod: r['Metode Hitung'] || 'Target Maksimal',
                }))
            };

            const result = await addKpiSetup(setupPayload, true);
            if (result) successCount++; else errorCount++;
        }

        await fetchData();
        toast({ title: "Impor Selesai", description: `${successCount} pengaturan berhasil diimpor. ${errorCount} gagal.` });

    } catch (e: any) {
        console.error("Import error:", e);
        toast({ variant: "destructive", title: "Gagal Mengimpor", description: e.message || "Terjadi kesalahan saat memproses file." });
    } finally {
        if (event.target) event.target.value = '';
    }
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 gap-1 bg-background text-foreground hover:bg-background/80" disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Impor/Ekspor</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" /> Impor dari Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Ekspor ke Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDownloadExample}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Unduh Contoh Format (Template Cerdas)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
