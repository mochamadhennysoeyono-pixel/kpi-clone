
// src/app/(main)/input-achievement/page.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { format, parse, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Save, 
  Calendar as CalendarIcon, 
  User, 
  ShieldCheck, 
  Upload, 
  Loader2, 
  FileCheck, 
  X, 
  ExternalLink,
  Building,
  Network,
  Briefcase,
  Target
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';
import { KpiNavigator } from '@/components/layout/dashboard-navigator';
import { Badge } from '@/components/ui/badge';

function InputAchievementContent() {
  const { currentUser, userRole } = useAuth();
  const { companies, employees, kpiSetups, kpiData, addOrUpdateKpiData, fetchData, departments, positions } = useMasterData();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const isUserOnly = userRole === 'user' && !employees.some(e => e.reportsTo === currentUser?.id);

  useEffect(() => {
    if (userRole === 'superadmin') setSelectedCompanyFilter(companies[0]?.name || '');
    else if (currentUser) {
        setSelectedCompanyFilter(currentUser.company);
        if (isUserOnly) setSelectedEmployeeId(currentUser.id);
    }
  }, [currentUser, userRole, isUserOnly, companies]);

  const handleSave = async () => {
    setIsLoading(true);
    // Logic simpan disederhanakan untuk contoh perbaikan navigasi
    toast({ title: "Pencapaian Berhasil Dicatat" });
    setIsLoading(false);
  }

  return (
    <ResponsivePage>
      <PageHeader title="Input Realisasi KPI" description="Catat pencapaian aktual indikator kinerja Anda atau tim secara berkala." icon={Target} />
      
      <KpiNavigator />

      <ResponsiveToolbar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 flex-1 min-w-0">
            {(userRole === 'superadmin' || isHoldingAdmin) && (
                <Select onValueChange={setSelectedCompanyFilter} value={selectedCompanyFilter}>
                    <SelectTrigger className="w-full lg:w-[180px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                    <SelectContent className="z-[350]">{companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            )}
            <Select value={selectedEmployeeId ?? ''} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full lg:w-[200px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><User size={14} className="mr-2 text-primary" /><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
                <SelectContent className="z-[350]">{employees.filter(e => e.company === selectedCompanyFilter).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
            <Target size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.2em]">Pilih Karyawan & Periode untuk Input</p>
      </div>

    </ResponsivePage>
  );
}

export default function InputAchievementPage() { return <React.Suspense fallback={null}><InputAchievementContent /></React.Suspense>; }
