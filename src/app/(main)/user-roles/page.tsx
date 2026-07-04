
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
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const permissionsData = [
  { feature: 'Dasbor Admin Global (Semua Klien)', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Peran & Hak Akses', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Data Perusahaan Klien', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Manajemen Langganan (Subscription)', superadmin: true, manajemen: false, hr_manager: false, dept_head: false, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Manajemen Akun Karyawan (Perusahaan)', superadmin: true, manajemen: true, hr_manager: false, dept_head: false, employee: false },
  { feature: 'Pengaturan KPI & KBO (Perusahaan)', superadmin: true, manajemen: true, hr_manager: true, dept_head: false, employee: false },
  { feature: 'Laporan Agregat (Perusahaan)', superadmin: true, manajemen: true, hr_manager: true, dept_head: false, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Manajemen Laporan Tim (Bawahan)', superadmin: false, manajemen: false, hr_manager: false, dept_head: true, employee: false },
  { feature: 'Persetujuan (Approval) KPI/KBO Tim', superadmin: false, manajemen: false, hr_manager: false, dept_head: true, employee: false },
  { feature: '---', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Input & Lihat Performa Pribadi', superadmin: false, manajemen: true, hr_manager: true, dept_head: true, employee: true },
  { feature: 'Mengakses Modul Pembelajaran (LMS)', superadmin: true, manajemen: true, hr_manager: true, dept_head: true, employee: true },
];

export default function UserRolesPage() {
  return (
    <ResponsivePage>
      <PageHeader 
        title="Matriks Peran & Hak Akses"
        description="Rincian otoritas akses untuk setiap peran pengguna di dalam ekosistem sistem PERFOM."
        icon={ShieldCheck}
      />

      <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
          <CardHeader className="bg-muted/30 p-4 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldAlert size={14} className="text-primary" /> Otoritas Fitur Berdasarkan Peran
              </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted/10">
                        <TableRow className="border-none">
                            <TableHead className="text-[10px] font-black uppercase py-4 px-6">Fitur / Halaman</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Superadmin</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Manajemen</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">HR Manager</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Dept. Head</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Employee</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissionsData.map((perm, index) => {
                          if (perm.feature === '---') {
                            return <TableRow key={index} className="bg-muted/20 border-none h-2"><TableCell colSpan={6} className="p-0"></TableCell></TableRow>;
                          }
                          return (
                            <TableRow key={perm.feature} className="border-border/40">
                                <TableCell className="font-bold text-xs px-6 py-4">{perm.feature}</TableCell>
                                <TableCell className="text-center">{perm.superadmin ? <Check className="mx-auto size-4 text-green-500 stroke-[3px]" /> : <X className="mx-auto size-4 text-muted-foreground/20" />}</TableCell>
                                <TableCell className="text-center">{perm.manajemen ? <Check className="mx-auto size-4 text-green-500 stroke-[3px]" /> : <X className="mx-auto size-4 text-muted-foreground/20" />}</TableCell>
                                <TableCell className="text-center">{perm.hr_manager ? <Check className="mx-auto size-4 text-green-500 stroke-[3px]" /> : <X className="mx-auto size-4 text-muted-foreground/20" />}</TableCell>
                                <TableCell className="text-center">{perm.dept_head ? <Check className="mx-auto size-4 text-green-500 stroke-[3px]" /> : <X className="mx-auto size-4 text-muted-foreground/20" />}</TableCell>
                                <TableCell className="text-center">{perm.employee ? <Check className="mx-auto size-4 text-green-500 stroke-[3px]" /> : <X className="mx-auto size-4 text-muted-foreground/20" />}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
              </ScrollArea>
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Card className="border-none shadow-sm bg-background p-6 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Definisi Peran Strategis</h4>
              <div className="space-y-4">
                  {[
                      { role: 'SUPERADMIN', desc: 'Akses absolut ke seluruh sistem dan semua data klien global.' },
                      { role: 'MANAJEMEN', desc: 'Pemilik perusahaan klien. Mengelola penempatan dan struktur unit bisnis.' },
                      { role: 'HR_MANAGER', desc: 'Fokus pada operasional SDM, setup KPI/KBO, dan pengawasan portal LMS.' },
                      { role: 'DEPT_HEAD', desc: 'Manajer lini dengan kewenangan approval laporan dan pemantauan tim.' }
                  ].map(r => (
                      <div key={r.role} className="flex gap-4">
                          <Badge variant="outline" className="w-24 h-6 justify-center font-black text-[9px] uppercase border-primary/20 text-primary shrink-0">{r.role}</Badge>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">{r.desc}</p>
                      </div>
                  ))}
              </div>
          </Card>
          
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                  <ShieldAlert size={18} />
                  <p className="font-black text-[10px] uppercase tracking-widest">Hard Lock Principle</p>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Hak akses di atas bersifat dinamis terhadap waktu. Meskipun Anda memiliki peran manajerial, sistem akan otomatis melakukan <strong>Lock Access</strong> jika periode penilaian telah berakhir di kalender sistem.
              </p>
          </div>
      </div>
    </ResponsivePage>
  );
}
