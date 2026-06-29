// src/app/(main)/holding-management/page.tsx
"use client";

import { useMemo } from 'react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GitMerge } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function UpgradeToHolding({ onUpgrade, canUpgrade }: { onUpgrade: () => void; canUpgrade: boolean }) {
  return (
    <Card className="max-w-2xl mx-auto mt-10 shadow-lg">
      <CardHeader className="items-center text-center">
        <GitMerge className="h-16 w-16 mb-4 text-primary" />
        <CardTitle className="font-headline text-2xl">Aktifkan Mode Holding</CardTitle>
        <CardDescription>
          Saat ini, perusahaan Anda beroperasi sebagai entitas tunggal. Aktifkan mode holding untuk dapat mengelola beberapa anak perusahaan, cabang, atau sister company di bawah perusahaan Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center p-6">
        {canUpgrade ? (
            <Button onClick={onUpgrade}>
                Upgrade Menjadi Holding Company
            </Button>
        ) : (
            <Alert variant="destructive">
                <AlertTitle>Tidak Diizinkan</AlertTitle>
                <AlertDescription>
                   Perusahaan Anda tidak memiliki izin untuk menjadi Holding. Silakan hubungi Superadmin untuk mendapatkan akses.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}


export default function HoldingManagementPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, updateCompany } = useMasterData();
    const { toast } = useToast();

    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);
    
    // This page should only be visible to manajemen roles that are NOT holding yet.
    // The sidebar logic should handle redirection for already-holding companies.
    
    const handleUpgrade = async () => {
        if (!userCompany) return;
        try {
        await updateCompany(userCompany.id, { isHolding: true });
        toast({
            title: "Upgrade Berhasil!",
            description: `${userCompany.name} sekarang adalah Holding Company. Menu akan diperbarui.`
        });
        // The sidebar will automatically update on the next render due to the context change.
        } catch (error) {
        toast({
            variant: "destructive",
            title: "Upgrade Gagal",
            description: "Terjadi kesalahan saat mengupgrade perusahaan."
        });
        }
    };
    
    if (userRole !== 'manajemen' || !userCompany) {
        return (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Akses Ditolak</CardTitle>
                    <CardDescription>Halaman ini hanya untuk admin perusahaan.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (userCompany.isHolding) {
        return (
             <Card className="shadow-lg overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground dark:bg-card dark:text-primary-foreground">
                    <CardTitle className='dark:text-white'>Sudah Menjadi Holding</CardTitle>
                    <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">Perusahaan Anda sudah berstatus sebagai holding company. Gunakan menu di samping untuk mengelola grup.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    // A 'manajemen' user of a non-holding company sees the upgrade prompt.
    return <UpgradeToHolding onUpgrade={handleUpgrade} canUpgrade={!!userCompany.canBecomeHolding} />;
}
