// src/app/(main)/holding-dashboard/page.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import HoldingDashboard from '@/components/holding/holding-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GitMerge } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function UpgradeToHolding({ onUpgrade, canUpgrade }: { onUpgrade: () => void; canUpgrade: boolean }) {
  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
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


export default function HoldingDashboardPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, updateCompany } = useMasterData();
    const { toast } = useToast();
    const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);

    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);
    
    const holdingCompanies = useMemo(() => {
        return companies.filter(c => c.isHolding && c.status === 'Aktif');
    }, [companies]);

    useEffect(() => {
        if (userRole === 'superadmin' && holdingCompanies.length > 0) {
            setSelectedHoldingId(holdingCompanies[0].id);
        } else if (userCompany) {
            setSelectedHoldingId(userCompany.id);
        }
    }, [userRole, userCompany, holdingCompanies]);
    
    const displayCompany = useMemo(() => {
        if (!selectedHoldingId) return null;
        return companies.find(c => c.id === selectedHoldingId);
    }, [selectedHoldingId, companies]);

    const childCompanies = useMemo(() => {
        if (!displayCompany) return [];
        const getAllDescendants = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            if (children.length === 0) return [];
            return [...children, ...children.flatMap(child => getAllDescendants(child.id))];
        };
        return getAllDescendants(displayCompany.id);
    }, [displayCompany, companies]);

    const handleUpgrade = async () => {
        if (!userCompany) return;
        try {
        await updateCompany(userCompany.id, { isHolding: true });
        toast({
            title: "Upgrade Berhasil!",
            description: `${userCompany.name} sekarang adalah Holding Company.`
        });
        } catch (error) {
        toast({
            variant: "destructive",
            title: "Upgrade Gagal",
            description: "Terjadi kesalahan saat mengupgrade perusahaan."
        });
        }
    };
    
    if (userRole !== 'superadmin' && !userCompany) {
        return <p>Memuat data perusahaan...</p>;
    }
    
    if (userRole !== 'superadmin' && !userCompany?.isHolding) {
        return <UpgradeToHolding onUpgrade={handleUpgrade} canUpgrade={!!userCompany?.canBecomeHolding} />;
    }

    if (!displayCompany) {
         return (
             <Card className="shadow-lg mb-6 overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
                    <CardTitle className="dark:text-white">Tidak Ada Perusahaan Holding</CardTitle>
                    <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">Tidak ada perusahaan holding yang terdaftar atau aktif untuk ditampilkan.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card className="shadow-lg mb-6 overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <CardTitle className="font-headline dark:text-white">Dasbor Agregat</CardTitle>
                            <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                            Pantau kinerja agregat untuk seluruh grup.
                            </CardDescription>
                        </div>
                        {userRole === 'superadmin' && holdingCompanies.length > 0 && (
                            <Select onValueChange={setSelectedHoldingId} value={selectedHoldingId ?? ''}>
                                <SelectTrigger className="w-full sm:w-[250px] bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                                    <SelectValue placeholder="Pilih Holding Company..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {holdingCompanies.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
            </Card>
            <HoldingDashboard holdingCompany={displayCompany} childCompanies={childCompanies} />
        </div>
    );
}
