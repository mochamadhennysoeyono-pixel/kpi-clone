// src/app/(main)/holding-kpi-setup/page.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import HoldingKpiSetup from '@/components/holding/holding-kpi-setup';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HoldingKpiSetupPage() {
    const { currentUser, userRole } = useAuth();
    const { companies } = useMasterData();
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
            const directChildren = companies.filter(c => c.parentId === parentId);
            if (directChildren.length === 0) return [];
            return [...directChildren, ...directChildren.flatMap(child => getAllDescendants(child.id))];
        };
        return getAllDescendants(displayCompany.id);
    }, [displayCompany, companies]);


    if (userRole !== 'superadmin' && !userCompany?.isHolding) {
        return (
            <Card className="shadow-lg mb-6">
                <CardHeader>
                    <CardTitle>Akses Ditolak</CardTitle>
                    <CardDescription>Halaman ini hanya untuk admin perusahaan holding.</CardDescription>
                </CardHeader>
            </Card>
        );
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
                            <CardTitle className="font-headline dark:text-white">Pengaturan KPI Induk</CardTitle>
                            <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                                Definisikan KPI di tingkat holding untuk diturunkan ke anak perusahaan.
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
            <HoldingKpiSetup holdingCompany={displayCompany} childCompanies={childCompanies} />
        </div>
    );
}
