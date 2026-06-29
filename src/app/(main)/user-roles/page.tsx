// src/app/(main)/user-roles/page.tsx
"use client";

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const permissionsData = [
  { feature: 'Dasbor Admin Global (Semua Klien)', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Peran & Hak Akses', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Data Perusahaan Klien', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Langganan (Subscription)', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Manajemen Akun Karyawan (Perusahaan Sendiri)', superadmin: true, manajemen: true, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Pengaturan KPI & KBO (Seluruh Perusahaan)', superadmin: true, manajemen: true, hr_manager: true, dept_head: false, employee: false },
  { feature: 'Laporan Agregat (Seluruh Perusahaan)', superadmin: true, manajemen: true, hr_manager: true, dept_head: false, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Manajemen Laporan Tim (Bawahan)', superadmin: false, manajemen: false, hr_manager: false, dept_head: true, employee: false },
  { feature: 'Persetujuan (Approval) KPI/KBO Tim', superadmin: false, manajemen: false, hr_manager: false, dept_head: true, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Input & Lihat Performa Pribadi', superadmin: false, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Mengakses Modul Pembelajaran (LMS)', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
];

export default function UserRolesPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
          <CardHeader className="bg-primary text-primary-foreground dark:bg-card dark:text-primary-foreground rounded-t-lg">
            <CardTitle className="font-headline dark:text-white">Matriks Peran & Hak Akses</CardTitle>
            <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
              Rincian hak akses untuk setiap peran pengguna di dalam sistem, selaras dengan Hard Lock System.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fitur / Halaman</TableHead>
                            <TableHead className="text-center">Superadmin</TableHead>
                            <TableHead className="text-center">Manajemen</TableHead>
                            <TableHead className="text-center">HR Manager</TableHead>
                            <TableHead className="text-center">Dept. Head</TableHead>
                            <TableHead className="text-center">Employee</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissionsData.map((perm, index) => {
                          if (perm.feature === '---') {
                            return <TableRow key={index}><TableCell colSpan={6} className="p-1 h-2 bg-muted/50"></TableCell></TableRow>;
                          }
                          return (
                            <TableRow key={perm.feature}>
                                <TableCell className="font-medium">{perm.feature}</TableCell>
                                <TableCell className="text-center">{perm.superadmin ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}</TableCell>
                                <TableCell className="text-center">{perm.manajemen ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}</TableCell>
                                <TableCell className="text-center">{perm.hr_manager ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}</TableCell>
                                <TableCell className="text-center">{perm.dept_head ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}</TableCell>
                                <TableCell className="text-center">{perm.employee ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
              </div>
              <div className="mt-6 border-t pt-4 space-y-4">
                  <h4 className="font-semibold mb-2">Definisi Peran:</h4>
                  <ul className="list-none space-y-3 text-sm">
                      <li className="flex items-start gap-3"><Badge variant="outline" className="w-28 justify-center font-semibold">SUPERADMIN</Badge><span className="text-muted-foreground">Akses absolut ke seluruh sistem dan semua data klien. Satu-satunya peran yang bisa mengelola data perusahaan dan langganan.</span></li>
                      <li className="flex items-start gap-3"><Badge variant="outline" className="w-28 justify-center font-semibold">MANAJEMEN</Badge><span className="text-muted-foreground">Pemilik atau direktur perusahaan klien. Mengelola pengguna dan struktur data internal perusahaannya.</span></li>
                      <li className="flex items-start gap-3"><Badge variant="outline" className="w-28 justify-center font-semibold">HR_MANAGER</Badge><span className="text-muted-foreground">Bertanggung jawab atas operasional HR, seperti membuat pengaturan KPI/KBO dan mengelola modul LMS.</span></li>
                      <li className="flex items-start gap-3"><Badge variant="outline" className="w-28 justify-center font-semibold">DEPT_HEAD</Badge><span className="text-muted-foreground">Atasan yang memiliki bawahan. Fokus pada persetujuan (approval) dan pemantauan kinerja timnya.</span></li>
                      <li className="flex items-start gap-3"><Badge variant="outline" className="w-28 justify-center font-semibold">EMPLOYEE</Badge><span className="text-muted-foreground">Pengguna individu yang fokus pada tugas dan pelaporan kinerja pribadi.</span></li>
                  </ul>
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-r-lg">
                    <p className="font-bold">Prinsip Kunci</p>
                    <p className="text-xs">Hak akses peran di atas hanya berlaku jika status sistem (dari kalender) adalah <strong className="text-green-600">ENABLE</strong>. Jika statusnya <strong className="text-red-600">LOCK</strong> atau <strong className="text-gray-600">READ_ONLY</strong>, semua aksi perubahan akan ditolak oleh <strong>Hard Lock System</strong>, terlepas dari peran pengguna.</p>
                  </div>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
