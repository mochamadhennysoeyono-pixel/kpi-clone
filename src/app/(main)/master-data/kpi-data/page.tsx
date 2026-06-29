// src/app/(main)/master-data/kpi-data/page.tsx
"use client";

import React, { useState, useMemo, useEffect, forwardRef, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, ChevronDown, Trash2, User, X, Maximize2, Minimize2, Download, Database, Search } from "lucide-react";
import type { Company, KpiData, KpiSetup, Employee, KpiIndicator, CalculationMethod } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { findKpiSetup } from "@/lib/kpi-utils";

function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
      setIsMounted(true);
      return () => {};
    }, []);

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 no-print">
            <div
                className={cn(
                    "relative flex flex-col bg-background text-foreground shadow-xl h-full max-h-screen transition-all duration-300",
                    isExpanded ? "w-full" : "w-full sm:w-[550px] lg:w-1/3"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b bg-muted/50 sticky top-0 z-10">
                    <h2 className="font-semibold text-foreground">Detail Pencapaian</h2>
                     <div className="flex items-center gap-2">
                         <button
                            className="hidden sm:flex p-2 rounded-md hover:bg-accent"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? "Kecilkan" : "Perlebar"}
                            >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button className="p-2 rounded-md hover:bg-accent" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                     <AchievementDetailContent kpiData={kpiData} isDialog={true} />
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function KpiDataPage() {
  const { kpiData, companies, deleteKpiData, employees, kpiSetups } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<KpiData[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedKpiData, setSelectedKpiData] = useState<KpiData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [filters, setFilters] = useState({
    company: "all",
    period: "all",
  });
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const isManager = useMemo(() => (userRole === 'user' || userRole === 'manajemen') && employees.some(e => e.reportsTo === currentUser?.id), [userRole, currentUser, employees]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  useEffect(() => {
    if (userRole !== 'superadmin' && manageableCompanies.length === 1) {
      setFilters(prev => ({ ...prev, company: manageableCompanies[0].name }));
    }
  }, [userRole, manageableCompanies]);

  const baseFilteredData = useMemo(() => {
    let baseData = kpiData;

    if (userRole === 'manajemen' && !isHoldingAdmin) {
        baseData = baseData.filter(d => d.company === currentUser?.company);
    } else if(userRole === 'manajemen' && isHoldingAdmin) {
        const managedCompanyNames = manageableCompanies.map(c => c.name);
        baseData = baseData.filter(d => managedCompanyNames.includes(d.company));
    } else if (isManager && currentUser) {
        const getSubordinateIdsRecursive = (managerId: string): string[] => {
            const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
            if (directReports.length === 0) return [];
            return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
        };
        const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
        baseData = baseData.filter(d => teamIds.includes(d.employeeId));
    }
    
    return baseData;
  }, [kpiData, userRole, isManager, isHoldingAdmin, currentUser, employees, manageableCompanies]);
  
  useEffect(() => {
    setSelectedKpiData(null);
  }, [filters]);


  const uniqueCompanyOptions = useMemo(() => {
    return [...new Set(baseFilteredData.map(d => d.company))];
  }, [baseFilteredData]);

  const uniquePeriodOptions = useMemo(() => {
    const periods = [...new Set(baseFilteredData
      .filter(d => (filters.company === 'all' || d.company === filters.company) && d.period)
      .map(d => d.period))]
      .sort((a,b) => b.localeCompare(a)); 
    return periods;
  }, [baseFilteredData, filters.company]);

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const filteredKpiData = useMemo(() => {
    return baseFilteredData.filter(d => {
      const companyMatch = filters.company === 'all' || d.company === filters.company;
      const periodMatch = filters.period === 'all' || d.period === filters.period;
      const searchMatch = !searchTerm || d.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      return companyMatch && periodMatch && searchMatch;
    });
  }, [baseFilteredData, filters, searchTerm]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(checked ? filteredKpiData.map(d => d.id) : []);
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };
  
  const openDeleteDialog = (items: KpiData[]) => {
    setDataToDelete(items);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (dataToDelete && dataToDelete.length > 0) {
      const idsToDelete = dataToDelete.map(d => d.id);
      await deleteKpiData(idsToDelete);
      setDataToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const getCycleDivider = (cycle: string): number => {
    switch(cycle) {
        case 'Bulanan': return 1;
        case '3 Bulan': return 3;
        case '6 Bulan': return 6;
        case '1 Tahun': return 12;
        default: return 1;
    }
  };

  const handleExport = async (dataToExport: KpiData[]) => {
    if (dataToExport.length === 0) {
        toast({ variant: 'destructive', title: "Tidak ada data untuk diekspor." });
        return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    for (const kpiEntry of dataToExport) {
        const employeeProfile = employees.find(e => e.id === kpiEntry.employeeId);
        const setup = findKpiSetup(kpiSetups, employeeProfile, kpiEntry.period);
        const minAchievement = setup?.minAchievement ?? 70;
        
        const firstName = kpiEntry.employeeName.split(' ')[0];
        const sheetName = `${firstName}_${kpiEntry.period}`.substring(0, 31);
        const sheet = workbook.addWorksheet(sheetName);

        // --- Column Config ---
        sheet.columns = [
            { width: 40 }, // A: Indikator
            { width: 25 }, // B: Kategori
            { width: 12 }, // C: Bobot (%)
            { width: 15 }, // D: Target
            { width: 15 }, // E: Aktual
            { width: 15 }, // F: Pencapaian (%)
            { width: 12 }, // G: Skor
        ];

        // --- Header Report ---
        sheet.mergeCells('A1:G1');
        const mainTitle = sheet.getCell('A1');
        mainTitle.value = 'Laporan Pencapaian KPI (Active Formula)';
        mainTitle.font = { size: 16, bold: true };
        mainTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        mainTitle.border = { bottom: { style: 'thin' } };

        // --- Metadata Section ---
        const metaData = [
            ['Nama', kpiEntry.employeeName],
            ['Jabatan', kpiEntry.position],
            ['Periode', format(parse(kpiEntry.period, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId })],
            ['Skor Akhir', kpiEntry.score],
            ['Status', kpiEntry.status],
        ];

        metaData.forEach((rowLabel, idx) => {
            const rowIndex = idx + 2;
            sheet.getCell(`A${rowIndex}`).value = rowLabel[0];
            sheet.getCell(`A${rowIndex}`).font = { bold: true };
            
            if (rowLabel[0] === 'Skor Akhir') {
                const lastDataRow = 8 + kpiEntry.achievements.length;
                sheet.getCell(`B${rowIndex}`).value = { formula: `SUM(G9:G${lastDataRow})`, result: kpiEntry.score };
                sheet.getCell(`B${rowIndex}`).font = { bold: true };
                sheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'right' };
            } else if (rowLabel[0] === 'Status') {
                sheet.getCell(`B${rowIndex}`).value = { 
                    formula: `IF(B5 >= ${minAchievement * 1.1}, "Melampaui Target", IF(B5 >= ${minAchievement}, "Mencapai Target", "Perlu Peningkatan"))`,
                    result: kpiEntry.status 
                };
                sheet.getCell(`B${rowIndex}`).font = { bold: true };
            } else {
                sheet.getCell(`B${rowIndex}`).value = rowLabel[1];
            }
        });

        // --- Table Headers ---
        const headerRowIndex = 8;
        const headers = ['Indikator', 'Kategori', 'Bobot (%)', 'Target', 'Aktual', 'Pencapaian (%)', 'Skor'];
        const headerRow = sheet.getRow(headerRowIndex);
        headerRow.values = headers;
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center' };
        });

        // --- Table Body ---
        let currentRow = headerRowIndex + 1;
        
        kpiEntry.achievements.forEach(ach => {
            const indicatorInfo = setup?.indicators.find(i => i.id === ach.indicatorId);
            const weight = indicatorInfo?.weight || 0;
            const cycleDivider = getCycleDivider(indicatorInfo?.cycle || 'Bulanan');
            const target = (indicatorInfo?.target || 0) / cycleDivider;
            const actual = ach.actual || 0;
            
            const r = currentRow;
            const row = sheet.getRow(r);
            
            // Base Values
            row.getCell(1).value = indicatorInfo?.indicator || 'N/A';
            row.getCell(2).value = indicatorInfo?.category || 'N/A';
            row.getCell(3).value = weight;
            row.getCell(4).value = target;
            row.getCell(5).value = actual;

            // Column F: Pencapaian (%) Formula
            row.getCell(6).value = { 
                formula: `IF(D${r}=0, IF(E${r}>0, 1, 0), E${r}/D${r})`,
                result: target > 0 ? (actual / target) : (actual > 0 ? 1 : 0)
            };

            // Column G: Skor Formula based on Calculation Method
            let scoreFormula = "";
            switch (indicatorInfo?.calculationMethod) {
                case 'Target Minimal':
                    scoreFormula = `IF(D${r}=0, IF(E${r}<=0, C${r}, 0), IF(E${r}>D${r}, 0, IF(E${r}=D${r}, C${r}*0.25, MIN(C${r}, C${r}*0.25 + ((D${r}-E${r})/D${r})*(C${r}-C${r}*0.25)))))`;
                    break;
                case 'Target Mutlak':
                    scoreFormula = `IF(E${r}=D${r}, C${r}, 0)`;
                    break;
                case 'Target Limit':
                    scoreFormula = `IF(E${r}<=D${r}, C${r}, 0)`;
                    break;
                case 'Target Maksimal':
                default:
                    scoreFormula = `IF(D${r}=0, IF(E${r}=0, C${r}, 0), MIN(E${r}/D${r}, 1) * C${r})`;
                    break;
            }
            row.getCell(7).value = { formula: scoreFormula, result: ach.score || 0 };

            // Formats
            row.getCell(3).numFmt = '0';
            row.getCell(4).numFmt = '#,##0';
            row.getCell(5).numFmt = '#,##0';
            row.getCell(6).numFmt = '0.0%';
            row.getCell(7).numFmt = '0.0';

            // Borders
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            currentRow++;
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_KPI_Aktif_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
        title: "Ekspor Berhasil",
        description: `${dataToExport.length} laporan dengan rumus aktif telah diekspor.`,
    });
};

   const getStatusBadgeVariant = (status: string) => {
    switch (status) {
    case "Melampaui Target":
        return "default";
    case "Mencapai Target":
        return "secondary";
    case "Perlu Peningkatan":
        return "destructive";
    default:
        return "outline";
    }
  };

  const formatPeriodLabel = (period: string): string => {
    try {
        const date = parse(period, 'yyyy-MM', new Date());
        return format(date, "LLLL yyyy", { locale: localeId });
    } catch (e) {
        return period;
    }
  }

  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  return (
    <>
      <div id="app-root" className="space-y-6 no-print">
        <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                      <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                      <CardTitle className="font-headline text-2xl">Data Pencapaian KPI</CardTitle>
                      <CardDescription>
                          Kelola dan analisis seluruh catatan historis pencapaian KPI karyawan. Menampilkan {filteredKpiData.length} data.
                      </CardDescription>
                  </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                  {selectedRowIds.length > 0 && (
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-10 gap-1 shadow-sm">
                              Aksi Massal ({selectedRowIds.length})
                              <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleExport(kpiData.filter(d => selectedRowIds.includes(d.id)))}>
                              <Download className="mr-2 h-4 w-4" />
                              Ekspor Pilihan ke Excel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(kpiData.filter(d => selectedRowIds.includes(d.id)))}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus Pilihan
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  )}
                  {filteredKpiData.length > 0 && selectedRowIds.length === 0 && (
                      <Button variant="outline" size="sm" className="h-10" onClick={() => handleExport(filteredKpiData)}>
                          <Download className="mr-2 h-4 w-4" />
                          Ekspor Semua Filter
                      </Button>
                  )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari nama karyawan..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {showCompanyFilter && (
                    <Select value={filters.company} onValueChange={(value) => handleFilterChange('company', value)}>
                        <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                        {uniqueCompanyOptions.map(company => (
                            <SelectItem key={company} value={company}>{company}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    )}
                    <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                        <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Periode" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Semua Periode</SelectItem>
                        {uniquePeriodOptions.map(period => (
                            <SelectItem key={period} value={period}>{formatPeriodLabel(period)}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                      <Checkbox
                          checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredKpiData.length && filteredKpiData.length > 0}
                          onCheckedChange={(e) => handleSelectAll(e.valueOf() as boolean)}
                          aria-label="Pilih semua"
                      />
                  </TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKpiData.map((data) => (
                  <TableRow 
                    key={data.id} 
                    data-state={selectedRowIds.includes(data.id) && "selected"}
                    onClick={() => setSelectedKpiData(data)}
                    className="cursor-pointer"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                              checked={selectedRowIds.includes(data.id)}
                              onCheckedChange={() => handleRowSelect(data.id)}
                              aria-label={`Pilih data untuk ${data.employeeName}`}
                          />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                          <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="grid gap-0.5">
                              <span className="font-medium">{data.employeeName}</span>
                              <span className="text-sm text-muted-foreground block sm:hidden">{data.position}</span>
                              <span className="text-xs text-muted-foreground hidden sm:inline">{data.department}</span>
                          </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatPeriodLabel(data.period)}</TableCell>
                    <TableCell className="font-semibold text-lg text-primary">{data.score.toFixed(1)}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(data.status)}>{data.status}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedKpiData(data)}>Lihat Rincian</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport([data])}>Ekspor ke Excel</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog([data])}>Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          itemName={dataToDelete?.length === 1 ? `data pencapaian ${dataToDelete[0].employeeName}` : `${dataToDelete?.length} item`}
          itemType="data pencapaian"
        />
        
        {selectedKpiData && (
          <ReportDetailView 
            kpiData={selectedKpiData}
            onClose={() => setSelectedKpiData(null)}
          />
        )}
      </div>
    </>
  );
}
