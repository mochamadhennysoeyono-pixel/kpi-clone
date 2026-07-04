// src/app/(main)/holding-dashboard/page.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import HoldingDashboard from '@/components/holding/holding-dashboard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GitMerge, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';

export default function HoldingDashboardPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, updateCompany, fetchData } = useMasterData();
    const { toast } = useToast();
    const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
    const [isUpgrading, setIsUpgrading] = useState(false);

    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);
    
    const holdingCompanies = useMemo(() => {
        return companies.filter(c => c.isHolding && c.status === 'Aktif');
    }, [companies]);

    useEffect(() => {
        if (userRole === 'superadmin' && holdingCompanies.length > 0) {
            if (!selectedHoldingId) setSelectedHoldingId(holdingCompanies[0].id);
        } else if (userCompany) {
            setSelectedHoldingId(userCompany.id);
        }
    }, [userRole, userCompany, holdingCompanies, selectedHoldingId]);
    
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
        setIsUpgrading(true);
        try {
            await updateCompany(userCompany.id, { isHolding: true });
            toast({ title: "Upgrade Berhasil!", description: `${userCompany.name} sekarang adalah Holding Company.` });
            await fetchData(true);
        } catch (error) {
            toast({ variant: "destructive", title: "Upgrade Gagal", description: "Terjadi kesalahan saat mengupgrade perusahaan." });
        } finally {
            setIsUpgrading(false);
        }
    };
    
    if (userRole !== 'superadmin' && !userCompany) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary size-8" />
            </div>
        );
    }
    
    if (userRole !== 'superadmin' && !userCompany?.isHolding) {
        return (
            <ResponsivePage className="flex items-center justify-center min-h-[80vh]">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
                        <GitMerge size={40} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black tracking-tighter">Aktifkan Mode Holding</h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Perusahaan Anda saat ini beroperasi secara mandiri. Aktifkan mode holding untuk mengelola grup perusahaan.
                        </p>
                    </div>
                    {userCompany?.canBecomeHolding ? (
                        <Button onClick={handleUpgrade} className="w-full h-12 font-bold shadow-lg" disabled={isUpgrading}>
                            {isUpgrading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Upgrade Menjadi Holding
                        </Button>
                    ) : (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-bold">
                            Izin upgrade belum diberikan. Silakan hubungi Superadmin.
                        </div>
                    )}
                </div>
            </ResponsivePage>
        );
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Dasbor Agregat Holding"
                description="Pantau kinerja kumulatif dan perbandingan antar unit bisnis dalam satu tampilan terpadu."
                icon={GitMerge}
                actions={
                    userRole === 'superadmin' && holdingCompanies.length > 0 && (
                        <Select onValueChange={setSelectedHoldingId} value={selectedHoldingId ?? ''}>
                            <SelectTrigger className="w-full sm:w-[250px] bg-background">
                                <SelectValue placeholder="Pilih Holding Company..." />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                {holdingCompanies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }
            />

            {displayCompany ? (
                <HoldingDashboard holdingCompany={displayCompany} childCompanies={childCompanies} />
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-30">
                    <GitMerge size={48} className="mx-auto mb-4" />
                    <p className="font-bold uppercase text-xs">Pilih data holding untuk dianalisis</p>
                </div>
            )}
        </ResponsivePage>
    );
}
