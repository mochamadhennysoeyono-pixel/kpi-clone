// src/app/(main)/holding-group-management/page.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import HoldingGroupManagement from '@/components/holding/holding-group-management';
import { Users, GitMerge } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';

export default function HoldingGroupManagementPage() {
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
        return companies.filter(c => c.parentId === displayCompany.id);
    }, [displayCompany, companies]);

    if (userRole !== 'superadmin' && !userCompany?.isHolding) {
        return <div className="p-20 text-center font-black uppercase text-xs opacity-40 italic">Akses Ditolak. Halaman khusus Holding Company.</div>;
    }

    return (
         <ResponsivePage>
            <PageHeader 
                title="Manajemen Grup"
                description="Kelola seluruh anak perusahaan, cabang, atau unit bisnis yang berada di bawah ekosistem holding Anda."
                icon={Users}
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
                <HoldingGroupManagement holdingCompany={displayCompany} childCompanies={childCompanies} />
            ) : (
                <div className="py-24 text-center border-2 border-dashed rounded-3xl opacity-20">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="font-bold uppercase text-xs">Pilih data holding untuk mengelola grup</p>
                </div>
            )}
        </ResponsivePage>
    );
}
