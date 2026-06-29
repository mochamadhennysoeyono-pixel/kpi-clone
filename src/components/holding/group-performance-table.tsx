// src/components/holding/group-performance-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { GroupPerformanceData } from './holding-dashboard';
import { Badge } from "../ui/badge";
import { Building, TrendingUp } from "lucide-react";

interface GroupPerformanceTableProps {
    performanceData: GroupPerformanceData[];
}

export default function GroupPerformanceTable({ performanceData }: GroupPerformanceTableProps) {
  return (
    <Card className="shadow-lg h-full">
        <CardHeader>
            <CardTitle>Peringkat Kinerja Grup</CardTitle>
            <CardDescription className="text-muted-foreground">Anak perusahaan diurutkan berdasarkan skor rata-rata.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Peringkat</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {performanceData.length > 0 ? performanceData.map((group, index) => (
                    <TableRow key={group.companyId}>
                        <TableCell className="font-medium text-center">
                             <div className="flex items-center justify-center">
                                {index === 0 ? <TrendingUp className="h-5 w-5 text-yellow-500" /> : <span className="text-muted-foreground">{index + 1}</span>}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-lg bg-muted">
                                    <Building className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="font-semibold">{group.companyName}</div>
                                    <div className="text-xs text-muted-foreground">{group.employeeCount} Karyawan</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                           <Badge variant="default" className="text-base">{group.averageScore.toFixed(1)}</Badge>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">Tidak ada data untuk ditampilkan.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
