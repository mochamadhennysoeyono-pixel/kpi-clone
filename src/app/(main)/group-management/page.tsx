
// src/app/(main)/group-management/page.tsx
"use client";

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building, GitMerge, Check, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Company } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';


export default function GroupManagementPage() {
  const { companies, updateCompany } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const handleToggleHoldingStatus = async (company: Company) => {
    try {
        await updateCompany(company.id, { isHolding: !company.isHolding });
        toast({
            title: "Status Holding Diperbarui",
            description: `Status holding untuk ${company.name} telah berhasil diubah.`
        });
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui",
            description: "Terjadi kesalahan saat mengubah status holding."
        });
    }
  };
  
   const handleToggleCanBecomeHolding = async (company: Company) => {
    try {
        await updateCompany(company.id, { canBecomeHolding: !company.canBecomeHolding });
        toast({
            title: "Izin Holding Diperbarui",
            description: `Izin menjadi holding untuk ${company.name} telah berhasil diubah.`
        });
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui",
            description: "Terjadi kesalahan saat mengubah izin holding."
        });
    }
  };

  if (userRole !== 'superadmin') {
    return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card dark:text-primary-foreground">
            <div>
              <CardTitle className="font-headline dark:text-white">Manajemen Status Holding</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Aktifkan atau nonaktifkan status holding untuk setiap perusahaan klien.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nama Perusahaan</TableHead>
                    <TableHead>Status Saat Ini</TableHead>
                    <TableHead>Izin Upgrade Mandiri</TableHead>
                    <TableHead className="text-right">Aksi (Aktifkan Holding)</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {companies.map((company) => (
                    <TableRow key={company.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                               {company.isHolding ? <GitMerge className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div>
                                <p>{company.name}</p>
                                <p className="text-xs text-muted-foreground">{company.businessField}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {company.isHolding ? (
                            <Badge>Holding Aktif</Badge>
                        ) : company.parentId ? (
                            <Badge variant="secondary">Anak Perusahaan</Badge>
                        ): (
                            <Badge variant="outline">Standalone</Badge>
                        )}
                    </TableCell>
                     <TableCell>
                        <div className="flex items-center gap-2">
                             <Switch
                                id={`can-become-${company.id}`}
                                checked={!!company.canBecomeHolding}
                                onCheckedChange={() => handleToggleCanBecomeHolding(company)}
                                disabled={!!company.parentId}
                            />
                            <label htmlFor={`can-become-${company.id}`} className="text-sm">
                                {company.canBecomeHolding ? 'Diizinkan' : 'Tidak Diizinkan'}
                            </label>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2">
                            <span className="text-sm">{company.isHolding ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            <Switch
                                id={`is-holding-${company.id}`}
                                checked={!!company.isHolding}
                                onCheckedChange={() => handleToggleHoldingStatus(company)}
                                disabled={!!company.parentId}
                            />
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
