// src/app/api/export-kpi-template/route.ts
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { KpiSetup, Employee } from '@/types';

// Helper function from client-side code, needs to be available here too
const getCycleDivider = (cycle: KpiSetup['indicators'][0]['cycle']): number => {
    switch(cycle) {
        case 'Bulanan': return 1;
        case '3 Bulan': return 3;
        case '6 Bulan': return 6;
        case '1 Tahun': return 12;
        default: return 1;
    }
};

export async function POST(req: Request) {
  try {
    const { setup, employees, months } = await req.json();

    if (!setup || !employees || !months) {
      return NextResponse.json({ error: "Missing required data." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    
    employees.forEach((emp: Employee) => {
        const sheetName = emp.name.replace(/[/\\?*[\]]/g, '').substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);
        
        let currentRow = 1;

        worksheet.addRow(['Employee ID', emp.id]).getCell(2).font = { bold: true };
        worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
        currentRow++;
        worksheet.addRow(['Nama Karyawan', emp.name]).getCell(2).font = { bold: true };
        worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
        currentRow+=2;

        const headers = ['No', 'Indikator', 'Cara Ukur', 'Bobot', 'Target (Bulanan)'];
        months.forEach((month: string) => {
            const monthStr = format(new Date(month), 'MMM yyyy', {locale: localeId});
            headers.push(`Aktual (${monthStr})`, `Keterangan (${monthStr})`);
        });
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        });
        currentRow++;

        (setup.indicators as KpiSetup['indicators']).forEach((indicator, index) => {
            if(indicator.source) return;
            
            const monthlyTarget = indicator.target / getCycleDivider(indicator.cycle);
            const targetUnit = indicator.targetFormat === 'Persentase' ? '%' : ` ${indicator.unit}`;
            const rowData = [
                index + 1,
                indicator.indicator,
                indicator.measurement,
                `${indicator.weight}%`,
                `${monthlyTarget.toLocaleString('id-ID', {maximumFractionDigits: 2})}${targetUnit}`
            ];
            months.forEach(() => {
                rowData.push('', '');
            });
            worksheet.addRow(rowData);
            currentRow++;
        });

        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell!({ includeEmpty: true }, cell => {
                let columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Template_Pencapaian.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error("Failed to generate Excel file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
