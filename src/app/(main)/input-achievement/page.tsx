// src/app/(main)/input-achievement/page.tsx
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { format, parse, lastDayOfMonth, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  Save, 
  Calendar as CalendarIcon, 
  User, 
  ShieldCheck, 
  Users, 
  Link as LinkIconLucide, 
  Pencil, 
  Lock, 
  Upload, 
  Loader2, 
  FileCheck, 
  X, 
  ExternalLink,
  FileUp,
  Link2,
  Building,
  Network,
  Briefcase,
  Target
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { Employee, KpiIndicator, KpiData, PerformanceStatus, KpiAchievement, KpiIndicatorCycle, KpiSetup, Company, TargetOverride, CalculationMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';

function InputAchievementContent() {
  const { currentUser, userRole } = useAuth();
  const { companies, employees, kpiSetups, kpiData, addOrUpdateKpiData, addOrUpdateTargetOverride, targetOverrides, updateKpiSetup, fetchData, departments, positions } = useMasterData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { isMobile } = useBreakpoint();

  const userCompanyFromMaster = useMemo(() => {
    const employeeRecord = employees.find(e => e.id === currentUser?.id);
    if (!employeeRecord) return null;
    return companies.find(c => c.name === employeeRecord.company) || null;
  }, [companies, employees, currentUser]);

  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompanyFromMaster?.isHolding, [userRole, userCompanyFromMaster]);
  
  const isManager = useMemo(() => {
    if (!currentUser || userRole === 'superadmin' || userRole === 'manajemen') return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, userRole, employees]);

  const isUserOnly = userRole === 'user' && !isManager;
  
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<Date>(new Date());
  const [achievements, setAchievements] = useState<{ [key: string]: Partial<KpiAchievement> }>({});
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingCycleTargetId, setEditingCycleTargetId] = useState<string | null>(null);

  // Evidence mode state: 'upload' or 'link' for each indicator
  const [evidenceModes, setEvidenceModes] = useState<Record<string, 'upload' | 'link'>>({});

  // Upload States
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompanyFromMaster) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompanyFromMaster, ...getChildCompanies(userCompanyFromMaster.id)];
    }
    if (userCompanyFromMaster) return [userCompanyFromMaster];
    return [];
  }, [userRole, isHoldingAdmin, userCompanyFromMaster, companies]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      if (manageableCompanies.length > 0) {
        setSelectedCompanyFilter(manageableCompanies[0].name);
      } else {
        setSelectedCompanyFilter('all');
      }
    } else if (isUserOnly && currentUser) {
      const currentEmployee = employees.find(e => e.id === currentUser.id);
      setSelectedCompanyFilter(currentEmployee?.company || '');
      setSelectedEmployeeId(currentUser.id);
    } else if ((userRole === 'manajemen' || isManager) && manageableCompanies.length > 0) {
      setSelectedCompanyFilter(manageableCompanies[0].name);
    }
  }, [currentUser, userRole, isUserOnly, isManager, manageableCompanies, employees]);

   useEffect(() => {
    const employeeNameToSelect = searchParams.get('employeeName');
    const periodToSelect = searchParams.get('period');

    if (employeeNameToSelect) {
      const employee = employees.find(e => e.name === employeeNameToSelect);
      if (employee) {
        const company = companies.find(c => c.name === employee.company);
        const department = employee.department;
        const position = employee.position;
        
        setSelectedCompanyFilter(company?.name || '');
        setSelectedDepartment(department);
        setSelectedPosition(position);
        setSelectedEmployeeId(employee.id);

        if (periodToSelect) {
            try {
                const periodDate = parse(periodToSelect, 'yyyy-MM', new Date());
                setSelectedPeriod(periodDate);
            } catch (error) {
                console.warn("Invalid period from URL:", periodToSelect);
            }
        }
      }
    }
  }, [searchParams, employees, companies]);


  const formattedPeriod = format(selectedPeriod, "yyyy-MM");

  const existingDataForPeriod = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return kpiData.find(d => d.employeeId === selectedEmployeeId && d.period === formattedPeriod);
  }, [kpiData, selectedEmployeeId, formattedPeriod]);
  
  const currentOverrides = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return targetOverrides.find(o => o.id === `${selectedEmployeeId}_${formattedPeriod}`);
  }, [targetOverrides, selectedEmployeeId, formattedPeriod]);
  
  const isApproved = useMemo(() => {
    return existingDataForPeriod?.approvalStatus === 'Disetujui';
  }, [existingDataForPeriod]);
  
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employees]);

  const kpiSetup = useMemo(() => {
    if (!selectedEmployee) return null;
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());
    return kpiSetups.find(s => {
      const isMatchRole = s.position === selectedEmployee.position &&
                          s.department === selectedEmployee.department &&
                          s.company === selectedEmployee.company &&
                          s.level === selectedEmployee.level &&
                          s.status === "Aktif";
      if (!isMatchRole) return false;
      const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
      const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;
      return validFrom && validTo && periodDate >= validFrom && periodDate <= validTo;
    });
  }, [selectedEmployee, kpiSetups, formattedPeriod]);
  
  const aggregatedValues = useMemo(() => {
    const supervisor = selectedEmployee;
    if (!kpiSetup || !supervisor || !['Supervisor', 'Manager', 'Direktur'].includes(supervisor.level)) return {};
    const supervisorRollupIndicators = kpiSetup.indicators.filter(ind => ind.rollup?.enabled);
    if (supervisorRollupIndicators.length === 0) return {};
    const subordinates = employees.filter(e => e.reportsTo === supervisor.id && e.status === 'Aktif');
    if (subordinates.length === 0) return {};
    const subordinateIds = subordinates.map(e => e.id);
    const subordinateKpiDataForPeriod = kpiData.filter(d => subordinateIds.includes(d.employeeId) && d.period === formattedPeriod);
    const aggregatedResult: { [supervisorIndicatorId: string]: number } = {};
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());

    supervisorRollupIndicators.forEach(supIndicator => {
        const values: number[] = [];
        subordinateKpiDataForPeriod.forEach(subData => {
            const subEmployee = employees.find(e => e.id === subData.employeeId);
            if (!subEmployee) return;
            const subKpiSetup = kpiSetups.find(s => {
                 const isMatch = s.company === subData.company && s.position === subData.position && s.department === subData.department && subEmployee.level === s.level && s.status === 'Aktif';
                if (!isMatch) return false;
                const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
                const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;
                return validFrom && validTo && periodDate >= validFrom && periodDate <= validTo;
            });
            if (!subKpiSetup) return;
            const sourcedIndicator = subKpiSetup.indicators.find(subInd => subInd.source?.indicatorId === supIndicator.id);
            if (sourcedIndicator) {
                const achievement = subData.achievements.find(ach => ach.indicatorId === sourcedIndicator.id);
                if (achievement && typeof achievement.actual === 'number') values.push(achievement.actual);
            }
        });
        if (values.length > 0) {
            if (supIndicator.rollup?.method === 'SUM') aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0);
            else if (supIndicator.rollup?.method === 'AVERAGE') aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
    });
    return aggregatedResult;
  }, [selectedEmployee, kpiSetup, employees, kpiData, formattedPeriod, kpiSetups]);

 useEffect(() => {
  const initialAchievements: { [key: string]: Partial<KpiAchievement> } = {};
  const initialModes: Record<string, 'upload' | 'link'> = {};
  if (kpiSetup && selectedEmployee) {
    if (currentOverrides) Object.entries(currentOverrides.overrides).forEach(([indicatorId, overrideValue]) => { initialAchievements[indicatorId] = { ...initialAchievements[indicatorId], indicatorId, monthlyTargetOverride: overrideValue }; });
    if (existingDataForPeriod?.achievements && Array.isArray(existingDataForPeriod.achievements)) {
      existingDataForPeriod.achievements.forEach((ach) => {
        const id = ach.indicatorId;
        if (!id) return;
        initialAchievements[id] = { ...(initialAchievements[id] ?? {}), ...ach };
        if (ach.linkBukti?.includes('firebasestorage.googleapis.com')) initialModes[id] = 'upload';
        else if (ach.linkBukti) initialModes[id] = 'link';
        else initialModes[id] = 'upload';
      });
    }
    kpiSetup.indicators.forEach((indicator) => {
      const id = indicator.id;
      if (!initialAchievements[id]) initialAchievements[id] = { indicatorId: id };
      if (!initialModes[id]) initialModes[id] = 'upload';
    });
  }
  setAchievements(initialAchievements);
  setEvidenceModes(initialModes);
}, [existingDataForPeriod, kpiSetup, aggregatedValues, selectedEmployee, currentOverrides]);


  const teamMembers = useMemo(() => {
    if (!isManager || !currentUser) return [];
    const getSubordinatesRecursive = (managerId: string): string[] => {
        const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
        if (directReports.length === 0) return [];
        return [...directReports, ...directReports.flatMap(getSubordinatesRecursive)];
    };
    const teamIds = [currentUser.id, ...getSubordinatesRecursive(currentUser.id)];
    return employees.filter(e => teamIds.includes(e.id));
  }, [isManager, currentUser, employees]);

  const departmentOptions = useMemo(() => {
    let options: string[] = [];
    if (isManager && !isHoldingAdmin) options = teamMembers.map(e => e.department);
    else {
        const companyNames = manageableCompanies.map(c => c.name);
        let relevantDepartments;
        if (selectedCompanyFilter && selectedCompanyFilter !== 'all') relevantDepartments = departments.filter(d => d.company === selectedCompanyFilter);
        else relevantDepartments = departments.filter(d => companyNames.includes(d.company));
        options = relevantDepartments.map(d => d.name);
    }
    return [...new Set(options)].filter((opt): opt is string => !!opt);
  }, [isManager, isHoldingAdmin, teamMembers, departments, selectedCompanyFilter, manageableCompanies]);

  const positionOptions = useMemo(() => {
    let options: string[] = [];
    if (isManager && !isHoldingAdmin) options = teamMembers.map(e => e.position);
    else {
        let relevantPositions = positions;
        const companyNames = manageableCompanies.map(c => c.name);
        if (selectedCompanyFilter && selectedCompanyFilter !== 'all') relevantPositions = relevantPositions.filter(p => p.company === selectedCompanyFilter);
        else relevantPositions = relevantPositions.filter(p => companyNames.includes(p.company));
        if (selectedDepartment && selectedDepartment !== 'all') relevantPositions = relevantPositions.filter(p => p.department === selectedDepartment);
        options = relevantPositions.map(p => p.name);
    }
    return [...new Set(options)].filter((opt): opt is string => !!opt);
  }, [isManager, isHoldingAdmin, teamMembers, positions, selectedCompanyFilter, selectedDepartment, manageableCompanies]);

  const employeeOptions = useMemo(() => {
    let filtered: Employee[] = [];
    if (userRole === 'manajemen' || userRole === 'superadmin') {
      filtered = employees;
      const companyNames = manageableCompanies.map(c => c.name);
      if (selectedCompanyFilter !== 'all') filtered = filtered.filter(e => e.company === selectedCompanyFilter);
      else filtered = filtered.filter(e => companyNames.includes(e.company));
      if(selectedDepartment && selectedDepartment !== 'all') filtered = filtered.filter(e => e.department === selectedDepartment);
      if(selectedPosition && selectedPosition !== 'all') filtered = filtered.filter(e => e.position === selectedPosition);
    } else if (isManager && currentUser) {
      let teamFiltered = teamMembers;
      if(selectedPosition && selectedPosition !== 'all') teamFiltered = teamFiltered.filter(e => e.position === selectedPosition);
      return teamFiltered;
    }
    return filtered.filter(e => e.status === 'Aktif');
  }, [employees, selectedCompanyFilter, selectedDepartment, selectedPosition, userRole, isManager, currentUser, manageableCompanies, teamMembers]);
  
  useEffect(() => {
    if (userRole === 'superadmin' && selectedEmployee) setSelectedCompanyFilter(selectedEmployee.company);
  }, [selectedEmployee, userRole]);

  const handleCompanyChange = (companyName: string) => {
    setSelectedCompanyFilter(companyName);
    setSelectedDepartment(null);
    setSelectedPosition(null);
    setSelectedEmployeeId(null);
    setAchievements({});
  };

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    setSelectedPosition(null);
    setSelectedEmployeeId(null);
    setAchievements({});
  }

  const handlePositionChange = (position: string) => {
    setSelectedPosition(position);
    setSelectedEmployeeId(null);
    setAchievements({});
  }

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setAchievements({});
  };
  
  const handleAchievementChange = (indicatorId: string, field: keyof KpiAchievement, value: string | number | boolean | null) => {
    setAchievements(prev => ({ ...prev, [indicatorId]: { ...prev[indicatorId], indicatorId, [field]: value } }));
  };

  const getCycleDivider = (cycle: KpiIndicatorCycle): number => {
    switch(cycle) { case 'Bulanan': return 1; case '3 Bulan': return 3; case '6 Bulan': return 6; case '1 Tahun': return 12; default: return 1; }
  }

  const distributedTargets = useMemo(() => {
    const finalTargets: { [indicatorId: string]: { monthly: number; cycle: number; isLocked: boolean } } = {};
    if (!kpiSetup || !selectedEmployee) return finalTargets;
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());
    kpiSetup.indicators.forEach(indicator => {
        let finalCycleTarget = indicator.target;
        let isLockedBySupervisor = false;
        if (indicator.source) {
            let sourceSetup: KpiSetup | undefined;
            if (indicator.source.employeeId === 'HOLDING') sourceSetup = kpiSetups.find(s => s.isHolding && s.indicators.some(i => i.id === indicator.source!.indicatorId));
            else if (selectedEmployee.reportsTo) {
                const supervisor = employees.find(e => e.id === selectedEmployee.reportsTo);
                if (supervisor) {
                    sourceSetup = kpiSetups.find(s => s.company === supervisor.company && s.position === supervisor.position && s.department === supervisor.department && s.level === supervisor.level && s.status === 'Aktif' && (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : new Date(0)) <= periodDate && (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : new Date()) >= periodDate);
                }
            }
            const sourceIndicator = sourceSetup?.indicators.find(ind => ind.id === indicator.source!.indicatorId);
            if (sourceIndicator) {
                if (indicator.source.employeeId === 'HOLDING') finalCycleTarget = sourceIndicator.targetAllocations?.[selectedEmployee.company]?.target ?? 0;
                else {
                    const overrides = sourceIndicator.targetOverrides || {};
                    isLockedBySupervisor = overrides[selectedEmployee.id] !== undefined;
                    if (isLockedBySupervisor) finalCycleTarget = overrides[selectedEmployee.id]!;
                    else {
                        let teamMates = employees.filter(e => e.reportsTo === selectedEmployee.reportsTo && e.position === selectedEmployee.position && e.department === selectedEmployee.department && e.status === 'Aktif');
                        const lockedTargetsSum = teamMates.filter(tm => overrides[tm.id] !== undefined && overrides[tm.id] !== null).reduce((sum, tm) => sum + (overrides[tm.id] || 0), 0);
                        const unlockedCount = teamMates.filter(tm => overrides[tm.id] === undefined || overrides[tm.id] === null).length || 1;
                        finalCycleTarget = (sourceIndicator.target - lockedTargetsSum) / unlockedCount;
                    }
                }
            }
        }
        const cycleDivider = getCycleDivider(indicator.cycle);
        let monthlyTarget = finalCycleTarget / cycleDivider;
        let isLockedByMonthlyOverride = false;
        const monthlyOverride = currentOverrides?.overrides[indicator.id];
        if (monthlyOverride !== undefined && monthlyOverride !== null) { monthlyTarget = monthlyOverride; isLockedByMonthlyOverride = true; }
        finalTargets[indicator.id] = { monthly: monthlyTarget, cycle: finalCycleTarget, isLocked: isLockedBySupervisor || isLockedByMonthlyOverride };
    });
    return finalTargets;
}, [kpiSetup, selectedEmployee, employees, kpiSetups, formattedPeriod, currentOverrides]);

  const calculateIndicatorScore = useCallback((actual: number | undefined, target: number, weight: number, method: CalculationMethod | undefined): number => {
    const act = Number(actual); const trg = Number(target); const w = Number(weight);
    if (isNaN(act) || isNaN(trg) || isNaN(w)) return 0;
    let score = 0;
    switch (method) {
      case 'Target Minimal':
        if (trg <= 0) score = act <= 0 ? w : 0;
        else if (act > trg) score = 0;
        else if (act === trg) score = w * 0.25;
        else { const ratio = (trg - act) / trg; score = (w * 0.25) + ratio * (w * 0.75); }
        break;
      case 'Target Mutlak': score = act === trg ? w : 0; break;
      case 'Target Limit': score = act <= trg ? w : 0; break;
      case 'Target Maksimal': default:
        if (trg === 0) score = act === 0 ? w : 0;
        else score = Math.min(act / trg, 1) * w;
        break;
    }
    return parseFloat((isFinite(score) && !isNaN(score) ? score : 0).toFixed(1));
  }, []);

  const totalScore = useMemo(() => {
    if (!kpiSetup) return 0;
    const total = kpiSetup.indicators.reduce((sum, indicator) => {
      const isRollup = indicator.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee?.level || 'Staff');
      const rawValue = isRollup ? aggregatedValues[indicator.id] : achievements[indicator.id]?.actual;
      const numericActual = (rawValue === undefined || rawValue === null || rawValue === '' || isNaN(parseFloat(String(rawValue)))) ? 0 : parseFloat(String(rawValue));
      return sum + calculateIndicatorScore(numericActual, distributedTargets[indicator.id]?.monthly ?? 0, indicator.weight, indicator.calculationMethod);
    }, 0);
    return parseFloat(total.toFixed(1));
  }, [achievements, kpiSetup, distributedTargets, aggregatedValues, selectedEmployee, calculateIndicatorScore]);

  const handleSave = async () => {
    if (!selectedEmployee || !kpiSetup) { toast({ variant: "destructive", title: "Gagal", description: "Pilih karyawan & setup terlebih dahulu." }); return; }
    if (isApproved) { toast({ variant: "destructive", title: "Terkunci", description: "Data periode ini sudah disetujui." }); return; }
    const achievementsPayload: KpiAchievement[] = kpiSetup.indicators.map(indicator => {
        const isRollup = !!indicator.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee.level);
        const achievement = achievements[indicator.id] || {};
        const rawActual = isRollup ? aggregatedValues[indicator.id] : achievement.actual;
        const actualValue = (rawActual === undefined || rawActual === null || rawActual === '') ? 0 : Number(rawActual);
        const score = calculateIndicatorScore(actualValue, distributedTargets[indicator.id]?.monthly ?? 0, indicator.weight, indicator.calculationMethod);
        const payload: KpiAchievement = { indicatorId: indicator.id, actual: actualValue, keterangan: achievement.keterangan || '', linkBukti: achievement.linkBukti || '', score };
        const monthlyOverride = currentOverrides?.overrides[indicator.id];
        if (monthlyOverride !== undefined && monthlyOverride !== null) payload.monthlyTargetOverride = monthlyOverride;
        return payload;
    });

    try {
        await addOrUpdateKpiData({ id: existingDataForPeriod?.id || `${selectedEmployee.id}_${formattedPeriod}`, period: formattedPeriod, employeeId: selectedEmployee.id, employeeName: selectedEmployee.name, company: selectedEmployee.company, department: selectedEmployee.department, position: selectedEmployee.position, level: selectedEmployee.level, reportsTo: selectedEmployee.reportsTo, score: totalScore, status: getStatus(totalScore, kpiSetup.minAchievement ?? 70), approvalStatus: existingDataForPeriod?.approvalStatus || "Menunggu Persetujuan", achievements: achievementsPayload });
        toast({ title: "Berhasil Disimpan" });
    } catch (e: any) { toast({ variant: "destructive", title: "Gagal", description: e.message }); }
  }

  const handleCycleTargetOverride = async (indicator: KpiIndicator, newCycleTarget: number | null) => {
    if (!selectedEmployee || !indicator.source) return;
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());
    let sourceSetup = indicator.source.employeeId === 'HOLDING' ? kpiSetups.find(s => s.isHolding && s.indicators.some(i => i.id === indicator.source!.indicatorId)) : employees.find(e => e.id === selectedEmployee.reportsTo) ? kpiSetups.find(s => { const supervisor = employees.find(e => e.id === selectedEmployee.reportsTo)!; return s.company === supervisor.company && s.position === supervisor.position && s.department === supervisor.department && s.level === supervisor.level && s.status === 'Aktif' && (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : new Date(0)) <= periodDate && (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : new Date()) >= periodDate; }) : undefined;
    if (!sourceSetup) return;
    const updatedSetup = JSON.parse(JSON.stringify(sourceSetup));
    const sourceInd = updatedSetup.indicators.find((i: any) => i.id === indicator.source!.indicatorId);
    if (!sourceInd) return;
    if (!sourceInd.targetOverrides) sourceInd.targetOverrides = {};
    if (newCycleTarget === null) delete sourceInd.targetOverrides[selectedEmployee.id];
    else sourceInd.targetOverrides[selectedEmployee.id] = newCycleTarget;
    try { await updateKpiSetup(updatedSetup.id, { indicators: updatedSetup.indicators }); setEditingCycleTargetId(null); toast({ title: "Target Diperbarui" }); await fetchData(); } catch (e: any) { toast({ variant: "destructive", title: "Gagal", description: e.message }); }
  };
  
  const handleTargetOverride = async (indicatorId: string, val: number | null) => {
    if (!selectedEmployeeId) return; setEditingTargetId(null);
    const overrides = { ...currentOverrides?.overrides };
    if (val === null) delete overrides[indicatorId]; else overrides[indicatorId] = val;
    try { await addOrUpdateTargetOverride({ id: `${selectedEmployeeId}_${formattedPeriod}`, overrides }); toast({ title: "Target Bulanan Disesuaikan" }); } catch (e: any) { toast({ variant: "destructive", title: "Gagal", description: e.message }); }
  };

  const handleEvidenceUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedEmployee) return;
    setIsUploading(prev => ({ ...prev, [id]: true }));
    const storageRef = ref(storage, `kpi_evidence/${selectedEmployee.company}/${selectedEmployee.id}/${formattedPeriod}/${id}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on("state_changed", (snap) => setUploadProgress(prev => ({ ...prev, [id]: (snap.bytesTransferred / snap.totalBytes) * 100 })), (err) => { toast({ variant: "destructive", title: "Gagal", description: err.message }); setIsUploading(prev => ({ ...prev, [id]: false })); }, async () => { const url = await getDownloadURL(uploadTask.snapshot.ref); handleAchievementChange(id, 'linkBukti', url); setIsUploading(prev => ({ ...prev, [id]: false })); setUploadProgress(prev => ({ ...prev, [id]: 0 })); toast({ title: "Bukti Diunggah" }); });
  };

  const handleRemoveEvidence = async (id: string) => {
    const url = achievements[id]?.linkBukti; if (!url) return;
    try { if (url.includes('firebasestorage')) await deleteObject(ref(storage, url)); handleAchievementChange(id, 'linkBukti', ''); toast({ title: "Bukti Dihapus" }); } catch (e: any) { toast({ variant: 'destructive', title: 'Gagal', description: e.message }); }
  };

  const canEditTargets = userRole === 'superadmin' || userRole === 'manajemen' || isManager;

  return (
    <ResponsivePage>
      <PageHeader title="Input Pencapaian KPI" description={isUserOnly ? `Selamat datang, ${selectedEmployee?.name}. Silakan isi data pencapaian Anda.` : "Pusat input realisasi target KPI karyawan."} icon={Target} />
      
      <ResponsiveToolbar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 flex-1 min-w-0">
            {showCompanyFilter && (
                <Select onValueChange={handleCompanyChange} value={selectedCompanyFilter}>
                    <SelectTrigger className="w-full lg:w-[180px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                    <SelectContent className="z-[350]">{manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            )}
            {!isUserOnly && (
                <>
                    <Select onValueChange={handleDepartmentChange} value={selectedDepartment ?? ''} disabled={!selectedCompanyFilter}>
                        <SelectTrigger className="w-full lg:w-[180px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Network size={14} className="mr-2 text-primary" /><SelectValue placeholder="Departemen" /></SelectTrigger>
                        <SelectContent className="z-[350]">{departmentOptions.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select onValueChange={handlePositionChange} value={selectedPosition ?? ''} disabled={!selectedDepartment}>
                        <SelectTrigger className="w-full lg:w-[180px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Briefcase size={14} className="mr-2 text-primary" /><SelectValue placeholder="Jabatan" /></SelectTrigger>
                        <SelectContent className="z-[350]">{positionOptions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedEmployeeId ?? ''} onValueChange={handleEmployeeChange} disabled={!selectedPosition}>
                        <SelectTrigger className="w-full lg:w-[200px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase"><User size={14} className="mr-2 text-primary" /><SelectValue placeholder="Karyawan" /></SelectTrigger>
                        <SelectContent className="z-[350]">{employeeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                </>
            )}
            <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full lg:w-[180px] h-9 bg-background border-none shadow-sm text-[10px] font-black uppercase gap-2"><CalendarIcon size={14} className="text-primary" /> {format(selectedPeriod, "MMM yyyy")}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[350]"><Calendar mode="single" selected={selectedPeriod} onSelect={(d) => { if(d){ setSelectedPeriod(d); setCalendarOpen(false); }}} defaultMonth={selectedPeriod} initialFocus /></PopoverContent>
            </Popover>
        </div>
      </ResponsiveToolbar>

      {isApproved && (
        <Alert className="bg-green-50 border-green-200"><ShieldCheck className="h-4 w-4 text-green-600" /><AlertDescription className="text-xs font-bold text-green-800 uppercase">Data periode ini telah disetujui dan terkunci.</AlertDescription></Alert>
      )}

      {selectedEmployee && kpiSetup ? (
        <div className="space-y-6">
            <AdaptiveCardGrid complexity="complex">
                {kpiSetup.indicators.map((kpi) => {
                    const achievement = achievements[kpi.id] || {};
                    const isRollup = !!kpi.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee.level);
                    const rawActual = isRollup ? aggregatedValues[kpi.id] : achievement.actual;
                    const targets = distributedTargets[kpi.id];
                    const monthlyTarget = targets?.monthly ?? 0;
                    const unit = kpi.targetFormat === 'Persentase' ? '%' : (kpi.unit ? ` ${kpi.unit}` : '');
                    const score = calculateIndicatorScore(parseFloat(String(rawActual)) || 0, monthlyTarget, kpi.weight, kpi.calculationMethod);
                    const mode = evidenceModes[kpi.id] || 'upload';

                    return (
                        <Card key={kpi.id} className="border-border/40 shadow-sm overflow-hidden flex flex-col bg-background">
                            <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <h4 className="font-black text-xs uppercase tracking-tight text-slate-800 leading-snug">{kpi.indicator}</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70 italic line-clamp-1">{kpi.measurement}</p>
                                    </div>
                                    <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] h-5">{kpi.weight}%</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-5 flex-grow">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Target Bulanan</p>
                                        <div className="flex items-center gap-2">
                                            {(editingTargetId === kpi.id) ? (
                                                <Input type="number" defaultValue={monthlyTarget} onBlur={(e) => handleTargetOverride(kpi.id, e.target.value === '' ? null : Number(e.target.value))} className="h-8 text-xs font-bold" autoFocus onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                                            ) : (
                                                <span className="text-sm font-black text-slate-700">{monthlyTarget.toLocaleString('id-ID')}{unit}</span>
                                            )}
                                            {canEditTargets && !isApproved && <button onClick={() => setEditingTargetId(kpi.id)} className="text-primary opacity-40 hover:opacity-100 transition-opacity"><Pencil size={10} /></button>}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-right">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estimasi Skor</p>
                                        <p className="text-lg font-black text-primary leading-none">{score.toFixed(1)}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Realisasi Aktual</Label>
                                        <div className="relative">
                                            <Input type="number" value={(rawActual === undefined || rawActual === null) ? '' : rawActual} onChange={(e) => handleAchievementChange(kpi.id, 'actual', e.target.value)} disabled={isApproved || isRollup} className={cn("h-11 font-black text-base bg-muted/5 border-none", isRollup && "bg-muted/30 cursor-not-allowed")} />
                                            {isRollup && <Users className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30" />}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Keterangan / Link Bukti</Label>
                                        <div className="space-y-2">
                                            {achievement.linkBukti ? (
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-green-50 border border-green-100">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-700 truncate">
                                                        <FileCheck size={14} /> {achievement.linkBukti.includes('firebasestorage') ? 'Berkas Terunggah' : 'Tautan Terlampir'}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-700" asChild><a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a></Button>
                                                        {!isApproved && <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => handleRemoveEvidence(kpi.id)}><X size={14} /></Button>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input placeholder="Tautan bukti (opsional)" className="h-9 text-xs bg-muted/5 border-none" value={achievement.linkBukti || ""} onChange={(e) => handleAchievementChange(kpi.id, 'linkBukti', e.target.value)} disabled={isApproved} />
                                                    {!isApproved && (
                                                        <>
                                                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRefs.current[kpi.id]?.click()} disabled={isUploading[kpi.id]}>
                                                                {isUploading[kpi.id] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                            </Button>
                                                            <input type="file" className="hidden" ref={el => fileInputRefs.current[kpi.id] = el} onChange={(e) => handleEvidenceUpload(kpi.id, e)} />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </AdaptiveCardGrid>

            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 md:static md:translate-x-0 md:max-w-none md:p-0">
                <Card className="bg-primary text-primary-foreground shadow-2xl rounded-2xl md:rounded-xl border-none">
                    <CardContent className="p-4 md:p-6 flex items-center justify-between gap-6">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Total Skor Akhir</p>
                            <p className="text-3xl font-black leading-none">{totalScore.toFixed(1)}</p>
                        </div>
                        <Button onClick={handleSave} disabled={isApproved || Object.values(isUploading).some(v => v)} className="bg-white text-primary hover:bg-white/90 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-xl active:scale-95 transition-all">
                            <Save className="mr-2 size-4" /> SIMPAN LAPORAN
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
            <Target size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.2em]">Pilih Karyawan & Periode</p>
        </div>
      )}
    </ResponsivePage>
  );
}

const getStatus = (s: number, min: number): PerformanceStatus => { const ex = min * 1.1; if (s >= ex) return "Melampaui Target"; if (s >= min) return "Mencapai Target"; return "Perlu Peningkatan"; };
export default function InputAchievementPage() { return <React.Suspense fallback={null}><InputAchievementContent /></React.Suspense>; }
