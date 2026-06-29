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
  Link2
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { Employee, KpiIndicator, KpiData, PerformanceStatus, KpiAchievement, KpiIndicatorCycle, KpiSetup, Company, TargetOverride, CalculationMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function InputAchievementContent() {
  const { currentUser, userRole } = useAuth();
  const { companies, employees, kpiSetups, kpiData, addOrUpdateKpiData, addOrUpdateTargetOverride, targetOverrides, updateKpiSetup, fetchData, departments, positions } = useMasterData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

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

      if (validFrom && validTo) {
        return periodDate >= validFrom && periodDate <= validTo;
      }
      return false;
    });
  }, [selectedEmployee, kpiSetups, formattedPeriod]);
  
  const aggregatedValues = useMemo(() => {
    const supervisor = selectedEmployee;
    if (!kpiSetup || !supervisor || !['Supervisor', 'Manager', 'Direktur'].includes(supervisor.level)) {
        return {};
    }

    const supervisorRollupIndicators = kpiSetup.indicators.filter(ind => ind.rollup?.enabled);
    if (supervisorRollupIndicators.length === 0) {
        return {};
    }

    const subordinates = employees.filter(e => e.reportsTo === supervisor.id && e.status === 'Aktif');
    if (subordinates.length === 0) {
        return {};
    }
    
    const subordinateIds = subordinates.map(e => e.id);
    
    const subordinateKpiDataForPeriod = kpiData.filter(
        d => subordinateIds.includes(d.employeeId) && d.period === formattedPeriod
    );

    const aggregatedResult: { [supervisorIndicatorId: string]: number } = {};
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());

    supervisorRollupIndicators.forEach(supIndicator => {
        const values: number[] = [];
        
        subordinateKpiDataForPeriod.forEach(subData => {
            const subEmployee = employees.find(e => e.id === subData.employeeId);
            if (!subEmployee) return;

            const subKpiSetup = kpiSetups.find(s => {
                 const isMatch = s.company === subData.company &&
                                s.position === subData.position &&
                                s.department === subData.department &&
                                subEmployee.level === s.level && 
                                s.status === 'Aktif';
                if (!isMatch) return false;
                
                const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
                const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;

                if (validFrom && validTo) {
                    return periodDate >= validFrom && periodDate <= validTo;
                }
                return false;
            });
            if (!subKpiSetup) return;
            
            const sourcedIndicator = subKpiSetup.indicators.find(subInd => subInd.source?.indicatorId === supIndicator.id);

            if (sourcedIndicator) {
                const achievement = subData.achievements.find(ach => ach.indicatorId === sourcedIndicator.id);
                if (achievement && typeof achievement.actual === 'number') {
                    values.push(achievement.actual);
                }
            }
        });

        if (values.length > 0) {
            if (supIndicator.rollup?.method === 'SUM') {
                aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0);
            } else if (supIndicator.rollup?.method === 'AVERAGE') {
                aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        }
    });
    
    return aggregatedResult;
  }, [selectedEmployee, kpiSetup, employees, kpiData, formattedPeriod, kpiSetups]);

 useEffect(() => {
  const initialAchievements: { [key: string]: Partial<KpiAchievement> } = {};
  const initialModes: Record<string, 'upload' | 'link'> = {};

  if (kpiSetup && selectedEmployee) {
    if (currentOverrides) {
      Object.entries(currentOverrides.overrides).forEach(([indicatorId, overrideValue]) => {
        initialAchievements[indicatorId] = {
          ...initialAchievements[indicatorId],
          indicatorId,
          monthlyTargetOverride: overrideValue,
        };
      });
    }

    if (existingDataForPeriod?.achievements && Array.isArray(existingDataForPeriod.achievements)) {
      existingDataForPeriod.achievements.forEach((ach) => {
        const id = ach.indicatorId;
        if (!id) return;
        initialAchievements[id] = {
          ...(initialAchievements[id] ?? {}),
          ...ach,
        };
        // Deduce mode: if it's a firebase URL, likely upload. Else link.
        if (ach.linkBukti?.includes('firebasestorage.googleapis.com')) {
            initialModes[id] = 'upload';
        } else if (ach.linkBukti) {
            initialModes[id] = 'link';
        } else {
            initialModes[id] = 'upload'; // Default
        }
      });
    }

    kpiSetup.indicators.forEach((indicator) => {
      const id = indicator.id;
      if (!initialAchievements[id]) {
          initialAchievements[id] = {
            indicatorId: id,
          };
      }
      if (!initialModes[id]) {
          initialModes[id] = 'upload';
      }
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
    if (isManager && !isHoldingAdmin) {
        options = teamMembers.map(e => e.department);
    } else {
        const companyNames = manageableCompanies.map(c => c.name);
        let relevantDepartments;
        if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
            relevantDepartments = departments.filter(d => d.company === selectedCompanyFilter);
        } else {
            relevantDepartments = departments.filter(d => companyNames.includes(d.company));
        }
        options = relevantDepartments.map(d => d.name);
    }
    return [...new Set(options)].filter((opt): opt is string => !!opt);
  }, [isManager, isHoldingAdmin, teamMembers, departments, selectedCompanyFilter, manageableCompanies]);

  const positionOptions = useMemo(() => {
    let options: string[] = [];
    if (isManager && !isHoldingAdmin) {
        options = teamMembers.map(e => e.position);
    } else {
        let relevantPositions = positions;
        const companyNames = manageableCompanies.map(c => c.name);
        
        if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
            relevantPositions = relevantPositions.filter(p => p.company === selectedCompanyFilter);
        } else {
            relevantPositions = relevantPositions.filter(p => companyNames.includes(p.company));
        }
        
        if (selectedDepartment && selectedDepartment !== 'all') {
            relevantPositions = relevantPositions.filter(p => p.department === selectedDepartment);
        }
        options = relevantPositions.map(p => p.name);
    }
    return [...new Set(options)].filter((opt): opt is string => !!opt);
  }, [isManager, isHoldingAdmin, teamMembers, positions, selectedCompanyFilter, selectedDepartment, manageableCompanies]);

  const employeeOptions = useMemo(() => {
    let filtered: Employee[] = [];

    if (userRole === 'manajemen' || userRole === 'superadmin') {
      filtered = employees;
      const companyNames = manageableCompanies.map(c => c.name);
      if (selectedCompanyFilter !== 'all') {
        filtered = filtered.filter(e => e.company === selectedCompanyFilter);
      } else {
        filtered = filtered.filter(e => companyNames.includes(e.company));
      }

      if(selectedDepartment && selectedDepartment !== 'all') {
        filtered = filtered.filter(e => e.department === selectedDepartment);
      }
      if(selectedPosition && selectedPosition !== 'all') {
        filtered = filtered.filter(e => e.position === selectedPosition);
      }
    } else if (isManager && currentUser) {
      let teamFiltered = teamMembers;
      if(selectedPosition && selectedPosition !== 'all') {
        teamFiltered = teamFiltered.filter(e => e.position === selectedPosition);
      }
      return teamFiltered;
    }
    
    return filtered.filter(e => e.status === 'Aktif');
  }, [employees, selectedCompanyFilter, selectedDepartment, selectedPosition, userRole, isManager, currentUser, manageableCompanies, teamMembers]);
  
  useEffect(() => {
    if (userRole === 'superadmin' && selectedEmployee) {
      setSelectedCompanyFilter(selectedEmployee.company);
    }
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
    setAchievements(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        indicatorId,
        [field]: value,
      }
    }));
  };

  const getCycleDivider = (cycle: KpiIndicatorCycle): number => {
    switch(cycle) {
        case 'Bulanan': return 1;
        case '3 Bulan': return 3;
        case '6 Bulan': return 6;
        case '1 Tahun': return 12;
        default:
            return 1;
    }
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
            if (indicator.source.employeeId === 'HOLDING') {
                 sourceSetup = kpiSetups.find(s => 
                    s.isHolding && 
                    s.indicators.some(i => i.id === indicator.source!.indicatorId)
                );

            } else if (selectedEmployee.reportsTo) {
                const supervisor = employees.find(e => e.id === selectedEmployee.reportsTo);
                if (supervisor) {
                    sourceSetup = kpiSetups.find(s => 
                        s.company === supervisor.company && s.position === supervisor.position && 
                        s.department === supervisor.department && s.level === supervisor.level && s.status === 'Aktif' &&
                        (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : new Date(0)) <= periodDate &&
                        (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : new Date()) >= periodDate
                    );
                }
            }
            
            const sourceIndicator = sourceSetup?.indicators.find(ind => ind.id === indicator.source!.indicatorId);
            if (sourceIndicator) {
                if (indicator.source.employeeId === 'HOLDING') {
                     finalCycleTarget = sourceIndicator.targetAllocations?.[selectedEmployee.company]?.target ?? 0;
                } else {
                     const overrides = sourceIndicator.targetOverrides || {};
                    isLockedBySupervisor = overrides[selectedEmployee.id] !== undefined;

                    if (isLockedBySupervisor) {
                        finalCycleTarget = overrides[selectedEmployee.id]!;
                    } else {
                        let teamMatesForDistribution: Employee[] = [];
                        let totalSourceTarget = sourceIndicator.target;
                        
                        if (selectedEmployee.reportsTo) {
                            teamMatesForDistribution = employees.filter(e =>
                                e.reportsTo === selectedEmployee.reportsTo &&
                                e.position === selectedEmployee.position &&
                                e.department === selectedEmployee.department &&
                                e.status === 'Aktif'
                            );
                        }
                        
                        const lockedTeamMates = teamMatesForDistribution.filter(tm => overrides[tm.id] !== undefined && overrides[tm.id] !== null);
                        const lockedTargetsSum = lockedTeamMates.reduce((sum, tm) => sum + (overrides[tm.id] || 0), 0);
                        
                        const unlockedTeamMates = teamMatesForDistribution.filter(tm => overrides[tm.id] === undefined || overrides[tm.id] === null);
                        const remainingTarget = totalSourceTarget - lockedTargetsSum;
                        
                        const count = unlockedTeamMates.length > 0 ? unlockedTeamMates.length : 1;
                        finalCycleTarget = remainingTarget / count;
                    }
                }
            }
        }
        
        const cycleDivider = getCycleDivider(indicator.cycle);
        let monthlyTarget = finalCycleTarget / cycleDivider;
        let isLockedByMonthlyOverride = false;
        
        const monthlyOverride = currentOverrides?.overrides[indicator.id];
        if (monthlyOverride !== undefined && monthlyOverride !== null) {
            monthlyTarget = monthlyOverride;
            isLockedByMonthlyOverride = true; 
        }
        
        finalTargets[indicator.id] = {
            monthly: monthlyTarget,
            cycle: finalCycleTarget,
            isLocked: isLockedBySupervisor || isLockedByMonthlyOverride,
        };
    });

    return finalTargets;
}, [kpiSetup, selectedEmployee, employees, kpiSetups, formattedPeriod, currentOverrides]);

  const calculateIndicatorScore = useCallback((
    actual: number | undefined,
    target: number,
    weight: number,
    method: CalculationMethod | undefined
  ): number => {
    const actualVal = Number(actual);
    const targetVal = Number(target);
    const weightVal = Number(weight);
  
    if (isNaN(actualVal) || isNaN(targetVal) || isNaN(weightVal)) {
      return 0;
    }
  
    let score = 0;
  
    switch (method) {
      case 'Target Minimal': {
        if (targetVal <= 0) {
            score = actualVal <= 0 ? weightVal : 0;
            break;
        }
        const minScore = weightVal * 0.25;
        if (actualVal > targetVal) { score = 0; }
        else if (actualVal === targetVal) { score = minScore; }
        else if (actualVal <= 0) { score = weightVal; }
        else { const ratio = (targetVal - actualVal) / targetVal; score = minScore + ratio * (weightVal - minScore); }
        break;
      }
      case 'Target Mutlak':
        score = actualVal === targetVal ? weightVal : 0;
        break;
      case 'Target Limit':
        score = actualVal <= targetVal ? weightVal : 0;
        break;
      case 'Target Maksimal':
      default:
        if (targetVal === 0) {
          score = actualVal === 0 ? weightVal : 0;
        } else {
          score = Math.min(actualVal / targetVal, 1) * weightVal;
        }
        break;
    }
  
    const safeScore = isFinite(score) && !isNaN(score) ? score : 0;
    return parseFloat(safeScore.toFixed(1));
  }, []);



  const totalScore = useMemo(() => {
    if (!kpiSetup) return 0;
    
    const total = kpiSetup.indicators.reduce((sum, indicator) => {
      const isRollup = indicator.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee?.level || 'Staff');
      const rawValue = isRollup ? aggregatedValues[indicator.id] : achievements[indicator.id]?.actual;
      
      const numericActual = (rawValue === undefined || rawValue === null || rawValue === '' || isNaN(parseFloat(String(rawValue)))) ? 0 : parseFloat(String(rawValue));
      const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
      
      const score = calculateIndicatorScore(numericActual, monthlyTarget, indicator.weight, indicator.calculationMethod);
      
      return sum + (isNaN(score) ? 0 : score);
    }, 0);
  
    return parseFloat(total.toFixed(1));
  }, [achievements, kpiSetup, distributedTargets, aggregatedValues, selectedEmployee, calculateIndicatorScore]);


  const getStatus = (score: number, minAchievement: number): PerformanceStatus => {
    const excellentThreshold = minAchievement * 1.1;
    if (score >= excellentThreshold) return "Melampaui Target";
    if (score >= minAchievement) return "Mencapai Target";
    return "Perlu Peningkatan";
  }

  const handleSave = async () => {
    if (!selectedEmployee || !kpiSetup) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Pastikan karyawan dan pengaturan KPI sudah dipilih dengan benar." });
      return;
    }
    
    if (isApproved) {
        toast({ variant: "destructive", title: "Data Terkunci", description: "Data KPI untuk periode ini sudah disetujui dan tidak dapat diubah." });
        return;
    }

    const achievementsPayload: KpiAchievement[] = kpiSetup.indicators.map(indicator => {
        const isRollupIndicator = !!indicator.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee.level);
        const achievement = achievements[indicator.id] || {};
        const rawActual = isRollupIndicator ? aggregatedValues[indicator.id] : achievement.actual;
        const actualValue = (rawActual === undefined || rawActual === null || rawActual === '') ? 0 : Number(rawActual);

        const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
        const score = calculateIndicatorScore(actualValue, monthlyTarget, indicator.weight, indicator.calculationMethod);
        
        const payload: KpiAchievement = {
            indicatorId: indicator.id,
            actual: actualValue,
            keterangan: achievement.keterangan || '',
            linkBukti: achievement.linkBukti || '',
            score: score,
        };
        
        const monthlyOverride = currentOverrides?.overrides[indicator.id];
        if (monthlyOverride !== undefined && monthlyOverride !== null) {
            payload.monthlyTargetOverride = monthlyOverride;
        }

        return payload;
    });

    const minAchievement = kpiSetup.minAchievement ?? 70;

    const dataPayload: KpiData = {
        id: existingDataForPeriod?.id || `${selectedEmployee.id}_${formattedPeriod}`,
        period: formattedPeriod,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        company: selectedEmployee.company,
        department: selectedEmployee.department,
        position: selectedEmployee.position,
        level: selectedEmployee.level,
        reportsTo: selectedEmployee.reportsTo,
        score: parseFloat(totalScore.toFixed(1)),
        status: getStatus(totalScore, minAchievement),
        approvalStatus: existingDataForPeriod?.approvalStatus || "Menunggu Persetujuan",
        achievements: achievementsPayload,
    };

    try {
        await addOrUpdateKpiData(dataPayload);
        toast({ title: "Data Disimpan", description: "Pencapaian KPI Anda telah disimpan." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: e.message });
    }
  }

  const handleCycleTargetOverride = async (indicator: KpiIndicator, newCycleTarget: number | null) => {
    if (!selectedEmployee || !indicator.source) {
        toast({ variant: "destructive", title: "Error", description: "Indikator ini tidak dapat diubah." });
        return;
    }
  
    let sourceSetup: KpiSetup | undefined;
    const periodDate = parse(formattedPeriod, 'yyyy-MM', new Date());
    
    if (indicator.source.employeeId === 'HOLDING') {
        sourceSetup = kpiSetups.find(s => s.isHolding && s.indicators.some(i => i.id === indicator.source!.indicatorId));
    } else {
        const supervisor = employees.find(e => e.id === selectedEmployee.reportsTo);
        if (supervisor) {
            sourceSetup = kpiSetups.find(s =>
                s.position === supervisor.position && s.department === supervisor.department &&
                s.company === supervisor.company && s.level === supervisor.level && s.status === 'Aktif' &&
                (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : new Date(0)) <= periodDate &&
                (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : new Date()) >= periodDate
            );
        }
    }
  
    if (!sourceSetup) {
        toast({ variant: "destructive", title: "Error", description: "Pengaturan KPI sumber tidak ditemukan." });
        return;
    }
    
    const updatedSetup = JSON.parse(JSON.stringify(sourceSetup));
    const sourceIndicatorToUpdate = updatedSetup.indicators.find((i: KpiIndicator) => i.id === indicator.source!.indicatorId);
    
    if (!sourceIndicatorToUpdate) {
        toast({ variant: "destructive", title: "Error", description: "Indikator sumber tidak ditemukan di setup." });
        return;
    }
    
    if (!sourceIndicatorToUpdate.targetOverrides) {
        sourceIndicatorToUpdate.targetOverrides = {};
    }
  
    if (newCycleTarget === null || newCycleTarget === undefined) {
        delete sourceIndicatorToUpdate.targetOverrides[selectedEmployee.id];
    } else {
        sourceIndicatorToUpdate.targetOverrides[selectedEmployee.id] = newCycleTarget;
    }
  
    try {
        await updateKpiSetup(updatedSetup.id, { indicators: updatedSetup.indicators });
        setEditingCycleTargetId(null);
        toast({ title: "Target Siklus Diperbarui" });
        await fetchData();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Memperbarui Target", description: e.message });
    }
  };
  
  const handleTargetOverride = async (indicatorId: string, newMonthlyTarget: number | null) => {
    if (!selectedEmployeeId) return;
    setEditingTargetId(null);
    const overrideDocId = `${selectedEmployeeId}_${formattedPeriod}`;
    const newOverrides = { ...currentOverrides?.overrides };
    if (newMonthlyTarget === null || newMonthlyTarget === undefined) {
      delete newOverrides[indicatorId];
    } else {
      newOverrides[indicatorId] = newMonthlyTarget;
    }
    try {
      const payload: TargetOverride = { id: overrideDocId, overrides: newOverrides };
      await addOrUpdateTargetOverride(payload);
      toast({ title: "Target Bulanan Disesuaikan" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Memperbarui Target", description: e.message });
    }
  };

  const handleEvidenceUpload = (indicatorId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;

    setIsUploading(prev => ({ ...prev, [indicatorId]: true }));
    setUploadProgress(prev => ({ ...prev, [indicatorId]: 0 }));

    const storagePath = `kpi_evidence/${selectedEmployee.company}/${selectedEmployee.id}/${formattedPeriod}/${indicatorId}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({ ...prev, [indicatorId]: progress }));
      },
      (error) => {
        console.error("Upload error:", error);
        toast({ variant: "destructive", title: "Gagal Mengunggah Bukti", description: error.message });
        setIsUploading(prev => ({ ...prev, [indicatorId]: false }));
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        handleAchievementChange(indicatorId, 'linkBukti', downloadURL);
        setIsUploading(prev => ({ ...prev, [indicatorId]: false }));
        setUploadProgress(prev => ({ ...prev, [indicatorId]: 0 }));
        toast({ title: "Bukti Diunggah", description: `File ${file.name} berhasil diunggah.` });
      }
    );
  };

  const handleRemoveEvidence = async (indicatorId: string) => {
    const currentUrl = achievements[indicatorId]?.linkBukti;
    if (!currentUrl) return;

    try {
        // Attempt to delete from storage if it's a firebase URL
        if (currentUrl.includes('firebasestorage.googleapis.com')) {
            const storageRef = ref(storage, currentUrl);
            await deleteObject(storageRef).catch(err => console.warn("File not found in storage while deleting metadata."));
        }
        handleAchievementChange(indicatorId, 'linkBukti', '');
        toast({ title: "Bukti Dihapus" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus Bukti', description: error.message });
    }
  };

  const isAnyUploading = Object.values(isUploading).some(v => v);
  const canEditTargets = userRole === 'superadmin' || userRole === 'manajemen' || isManager;
  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Input Pencapaian KPI</CardTitle>
          <CardDescription>
            {isUserOnly
              ? `Selamat datang, ${selectedEmployee?.name}. Pilih periode untuk menginput pencapaian KPI Anda.`
              : "Pilih karyawan dan periode untuk memasukkan pencapaian KPI mereka."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {(userRole === 'superadmin' || userRole === 'manajemen') && (
              <>
                {showCompanyFilter && (
                    <div>
                    <Label htmlFor="company">Perusahaan</Label>
                    <Select onValueChange={handleCompanyChange} value={selectedCompanyFilter}>
                        <SelectTrigger id="company">
                        <SelectValue placeholder="Pilih perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                        {manageableCompanies.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                )}
                <div>
                  <Label htmlFor="department">Departemen</Label>
                  <Select onValueChange={handleDepartmentChange} value={selectedDepartment ?? ''} disabled={departmentOptions.length === 0}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Pilih departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Jabatan</Label>
                  <Select onValueChange={handlePositionChange} value={selectedPosition ?? ''} disabled={positionOptions.length === 0}>
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionOptions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employee">Karyawan</Label>
                  <Select value={selectedEmployeeId ?? ''} onValueChange={handleEmployeeChange} disabled={employeeOptions.length === 0}>
                    <SelectTrigger id="employee">
                      <SelectValue placeholder="Pilih karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {isManager && !isUserOnly && !showCompanyFilter && (
               <>
                 <div>
                  <Label htmlFor="position-manager">Jabatan Tim</Label>
                  <Select value={selectedPosition ?? ""} onValueChange={handlePositionChange}>
                    <SelectTrigger id="position-manager"><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                    <SelectContent>{positionOptions.map((pos) => (<SelectItem key={pos} value={pos}>{pos}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="employee-manager">Karyawan</Label>
                  <Select value={selectedEmployeeId ?? ""} onValueChange={handleEmployeeChange} disabled={!selectedPosition}>
                    <SelectTrigger id="employee-manager"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                    <SelectContent>{employeeOptions.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="period">Periode</Label>
               <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedPeriod && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedPeriod ? format(selectedPeriod, "LLLL yyyy", { locale: localeId }) : <span>Pilih bulan</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedPeriod} onSelect={(date) => { if (date) { setSelectedPeriod(date); setCalendarOpen(false); } }} defaultMonth={selectedPeriod} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {isUserOnly && selectedEmployee && (
            <div className="flex items-center gap-4 text-sm p-4 border rounded-lg bg-muted/30">
                <User className="h-6 w-6 text-primary"/>
                <div>
                    <p className="font-semibold">{selectedEmployee.name}</p>
                    <p className="text-muted-foreground">{selectedEmployee.position} / {selectedEmployee.department}</p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isApproved && (
        <Alert variant="default" className="bg-green-50 border-green-300 text-green-800">
            <ShieldCheck className="h-4 w-4 !text-green-600" />
            <AlertDescription className="font-medium">Data untuk periode ini sudah disetujui dan tidak dapat diubah lagi.</AlertDescription>
        </Alert>
      )}

      {selectedEmployee && kpiSetup && (
        <Card>
          <CardHeader>
            <CardTitle>Indikator KPI untuk {kpiSetup.position}</CardTitle>
            <CardDescription>
              {existingDataForPeriod ? "Edit pencapaian aktual di bawah ini." : "Masukkan pencapaian aktual untuk setiap indikator. Skor dihitung secara otomatis."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMobile ? (
                 <div className="space-y-4">
                  {kpiSetup.indicators.map((kpi) => {
                    const achievement = achievements[kpi.id] || {};
                    const isSourced = !!kpi.source;
                    const isRollupIndicator = !!kpi.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee?.level || 'Staff');
                    const rawActual = isRollupIndicator ? aggregatedValues[kpi.id] : achievement.actual;
                    const targets = distributedTargets[kpi.id];
                    const monthlyTarget = targets?.monthly ?? 0;
                    const cycleTarget = targets?.cycle ?? 0;
                    const isLocked = targets?.isLocked;
                    const unit = kpi.targetFormat === 'Persentase' ? '%' : kpi.unit ? ` ${kpi.unit}` : '';
                    const score = calculateIndicatorScore(parseFloat(String(rawActual)) || 0, monthlyTarget, kpi.weight, kpi.calculationMethod);
                    const finalValueForInput = (rawActual === undefined || rawActual === null || isNaN(rawActual as number)) ? '' : rawActual;
                    
                    const evidenceMode = evidenceModes[kpi.id] || 'upload';

                    return (
                        <Card key={kpi.id} className="bg-background">
                            <CardHeader className="p-3">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-semibold text-sm flex items-center gap-1.5 pr-2">
                                      {kpi.indicator}
                                      {!!kpi.rollup?.enabled && <Users className="h-3 w-3 text-muted-foreground" />}
                                      {isSourced && <LinkIconLucide className="h-3 w-3 text-muted-foreground" />}
                                  </h4>
                                  <div className="text-right flex-shrink-0">
                                      <p className="text-xs text-muted-foreground">Bobot</p>
                                      <p className="font-bold">{kpi.weight}%</p>
                                  </div>
                                </div>
                                {kpi.measurement && <p className="text-xs text-muted-foreground pt-1 border-t">Cara Ukur: {kpi.measurement}</p>}
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Target</Label>
                                         <div className="font-semibold flex items-center gap-2">
                                            { (editingCycleTargetId === kpi.id || editingTargetId === kpi.id) ? (
                                                <Input type="number" defaultValue={isSourced ? cycleTarget : monthlyTarget} onBlur={(e) => { const newValue = e.target.value === '' ? null : parseFloat(e.target.value); if (isSourced) handleCycleTargetOverride(kpi, newValue); else handleTargetOverride(kpi.id, newValue); }} className="h-8 text-sm w-24" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                                            ) : (
                                              <div className="flex items-baseline gap-1.5">
                                                <span>{monthlyTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit}</span>
                                                {kpi.cycle !== 'Bulanan' && <p className="text-muted-foreground text-[10px] whitespace-nowrap">(Siklus: {cycleTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit})</p>}
                                              </div>
                                            )}
                                             {canEditTargets && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (isSourced) { if (isLocked) handleCycleTargetOverride(kpi, null); else setEditingCycleTargetId(kpi.id); } else { if (isLocked) handleTargetOverride(kpi.id, null); else setEditingTargetId(kpi.id); } }} disabled={isApproved}>
                                                              {isLocked ? <Lock className="h-3 w-3 text-primary" /> : <Pencil className="h-3 w-3" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{isLocked ? 'Buka kunci & reset target' : 'Edit & kunci target'}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                     <div>
                                        <Label className="text-xs">Skor</Label>
                                        <div className="font-bold text-lg text-primary">{score.toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`actual-${kpi.id}`}>Aktual</Label>
                                  <Input id={`actual-${kpi.id}`} type="number" value={finalValueForInput} onChange={(e) => handleAchievementChange(kpi.id, 'actual', e.target.value)} disabled={isApproved || isRollupIndicator} className={cn((isRollupIndicator) && "font-bold bg-muted/50 cursor-not-allowed")} placeholder="Input aktual..." />
                                </div>
                                 <div className="space-y-2">
                                  <Label htmlFor={`keterangan-${kpi.id}`}>Keterangan (Opsional)</Label>
                                  <Input id={`keterangan-${kpi.id}`} value={achievement.keterangan ?? ''} onChange={(e) => handleAchievementChange(kpi.id, 'keterangan', e.target.value)} disabled={isApproved} placeholder="Keterangan tambahan..." />
                                </div>
                                 <div className="space-y-2">
                                  <Label>Bukti Pencapaian</Label>
                                  <div className="flex flex-col gap-2">
                                      {achievement.linkBukti ? (
                                          <div className="flex items-center justify-between p-2 border rounded bg-muted/30">
                                              <div className="flex items-center gap-2 truncate">
                                                  {achievement.linkBukti.includes('firebasestorage') ? <FileCheck className="h-4 w-4 text-green-600" /> : <LinkIconLucide className="h-4 w-4 text-blue-600" />}
                                                  <span className="text-xs truncate">{achievement.linkBukti.includes('firebasestorage') ? 'Bukti Terlampir' : 'Tautan Terlampir'}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                                                  {!isApproved && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveEvidence(kpi.id)}><X className="h-3.5 w-3.5" /></Button>}
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="space-y-2">
                                              <Tabs value={evidenceMode} onValueChange={(v) => setEvidenceModes(prev => ({...prev, [kpi.id]: v as 'upload' | 'link'}))}>
                                                  <TabsList className="grid w-full grid-cols-2 h-8">
                                                      <TabsTrigger value="upload" className="text-[10px]"><FileUp className="h-3 w-3 mr-1"/> Upload</TabsTrigger>
                                                      <TabsTrigger value="link" className="text-[10px]"><Link2 className="h-3 w-3 mr-1"/> Link</TabsTrigger>
                                                  </TabsList>
                                              </Tabs>
                                              
                                              {evidenceMode === 'upload' ? (
                                                  <div className="flex items-center gap-2">
                                                      <Button variant="outline" size="sm" className="w-full text-xs h-9" onClick={() => fileInputRefs.current[kpi.id]?.click()} disabled={isApproved || isUploading[kpi.id]}>
                                                          {isUploading[kpi.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                                                          {isUploading[kpi.id] ? 'Mengunggah...' : 'Pilih File'}
                                                      </Button>
                                                      <input type="file" className="hidden" ref={el => fileInputRefs.current[kpi.id] = el} onChange={(e) => handleEvidenceUpload(kpi.id, e)} disabled={isApproved} />
                                                  </div>
                                              ) : (
                                                  <Input 
                                                      placeholder="https://google-drive.com/..." 
                                                      className="h-9 text-xs" 
                                                      value={achievement.linkBukti ?? ''} 
                                                      onChange={(e) => handleAchievementChange(kpi.id, 'linkBukti', e.target.value)}
                                                      disabled={isApproved}
                                                  />
                                              )}
                                          </div>
                                      )}
                                      {isUploading[kpi.id] && <Progress value={uploadProgress[kpi.id] || 0} className="h-1" />}
                                  </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                  })}
                 </div>
            ) : (
              <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indikator</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Bobot</TableHead>
                      <TableHead>Aktual</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="w-[200px]">Bukti Pencapaian</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {kpiSetup.indicators.map((kpi) => {
                    const achievement = achievements[kpi.id] || {};
                    const isSourced = !!kpi.source;
                    const isRollupIndicator = !!kpi.rollup?.enabled && ['Supervisor', 'Manager', 'Direktur'].includes(selectedEmployee?.level || 'Staff');
                    const rawActual = isRollupIndicator ? aggregatedValues[kpi.id] : achievement.actual;
                    const targets = distributedTargets[kpi.id];
                    const monthlyTarget = targets?.monthly ?? 0;
                    const cycleTarget = targets?.cycle ?? 0;
                    const isLocked = targets?.isLocked;
                    const safeActual = parseFloat(String(rawActual)) || 0;
                    const score = calculateIndicatorScore(safeActual, monthlyTarget, kpi.weight, kpi.calculationMethod);
                    const finalValueForInput = (rawActual === undefined || rawActual === null || isNaN(rawActual as number)) ? '' : rawActual;
                    const unit = kpi.targetFormat === 'Persentase' ? '%' : kpi.unit ? ` ${kpi.unit}` : '';
                    
                    const evidenceMode = evidenceModes[kpi.id] || 'upload';
  
                    const actualInput = (
                      <Input type="number" value={finalValueForInput} onChange={(e) => handleAchievementChange(kpi.id, 'actual', e.target.value)} disabled={isApproved || isRollupIndicator} className={cn("h-8 text-xs min-w-[80px]", (isRollupIndicator) && "font-bold bg-muted/50 cursor-not-allowed")} />
                    );
  
                    return (
                      <TableRow key={kpi.id}>
                        <TableCell className="font-medium text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm">{kpi.indicator}</span>
                            {kpi.measurement && (
                              <span className="text-[10px] text-muted-foreground leading-tight max-w-[200px]">
                                <span className="font-medium uppercase tracking-wider text-[9px] block mb-0.5 text-primary/70">Cara Ukur:</span>
                                {kpi.measurement}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                                {!!kpi.rollup?.enabled && <Users className="h-3 w-3 text-muted-foreground" />}
                                {isSourced && <LinkIconLucide className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            { (editingCycleTargetId === kpi.id || editingTargetId === kpi.id) ? (
                              <Input type="number" defaultValue={isSourced ? cycleTarget : monthlyTarget} onBlur={(e) => { const newValue = e.target.value === '' ? null : parseFloat(e.target.value); if (isSourced) handleCycleTargetOverride(kpi, newValue); else handleTargetOverride(kpi.id, newValue); }} className="h-8 text-xs w-24" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                            ) : (
                              <>
                                <span className="font-medium min-w-[80px] flex items-baseline gap-1.5">
                                  {monthlyTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit}
                                  {kpi.cycle !== 'Bulanan' && <span className="text-muted-foreground text-[10px] whitespace-nowrap">(Siklus: {cycleTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit})</span>}
                                </span>
                                {canEditTargets && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (isSourced) { if (isLocked) handleCycleTargetOverride(kpi, null); else setEditingCycleTargetId(kpi.id); } else { if (isLocked) handleTargetOverride(kpi.id, null); else setEditingTargetId(kpi.id); } }} disabled={isApproved}>
                                        {isLocked ? <Lock className="h-3 w-3 text-primary" /> : <Pencil className="h-3 w-3" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{isLocked ? 'Buka kunci & reset target' : 'Edit & kunci target'}</p></TooltipContent>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{kpi.weight}%</TableCell>
                        <TableCell>{isRollupIndicator ? (<Tooltip><TooltipTrigger asChild>{actualInput}</TooltipTrigger><TooltipContent><p>Dihitung otomatis dari pencapaian tim.</p></TooltipContent></Tooltip>) : actualInput}</TableCell>
                        <TableCell><Input value={achievements[kpi.id]?.keterangan ?? ''} onChange={(e) => handleAchievementChange(kpi.id, 'keterangan', e.target.value)} disabled={isApproved} className="h-8 text-xs min-w-[150px]" placeholder="Opsional" /></TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1.5">
                                {achievement.linkBukti ? (
                                    <div className="flex items-center justify-between p-1 px-2 border rounded-md bg-muted/20">
                                        {achievement.linkBukti.includes('firebasestorage') ? <FileCheck className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <LinkIconLucide className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                        <div className="flex items-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild><a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                                            {!isApproved && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveEvidence(kpi.id)}><X className="h-3 w-3" /></Button>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1 border rounded p-0.5 bg-muted/30">
                                            <button 
                                                onClick={() => setEvidenceModes(prev => ({...prev, [kpi.id]: 'upload'}))}
                                                className={cn("flex-1 text-[10px] py-0.5 rounded transition-all", evidenceMode === 'upload' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}
                                            >Upload</button>
                                            <button 
                                                onClick={() => setEvidenceModes(prev => ({...prev, [kpi.id]: 'link'}))}
                                                className={cn("flex-1 text-[10px] py-0.5 rounded transition-all", evidenceMode === 'link' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}
                                            >Link</button>
                                        </div>
                                        {evidenceMode === 'upload' ? (
                                            <>
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] w-full" onClick={() => fileInputRefs.current[kpi.id]?.click()} disabled={isApproved || isUploading[kpi.id]}>
                                                    {isUploading[kpi.id] ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Upload className="h-3 w-3 mr-1.5" />}
                                                    {isUploading[kpi.id] ? 'Unggah...' : 'Pilih File'}
                                                </Button>
                                                <input type="file" className="hidden" ref={el => fileInputRefs.current[kpi.id] = el} onChange={(e) => handleEvidenceUpload(kpi.id, e)} disabled={isApproved} />
                                            </>
                                        ) : (
                                            <Input 
                                                placeholder="https://..." 
                                                className="h-7 text-[10px]" 
                                                value={achievement.linkBukti ?? ''} 
                                                onChange={(e) => handleAchievementChange(kpi.id, 'linkBukti', e.target.value)}
                                                disabled={isApproved}
                                            />
                                        )}
                                    </div>
                                )}
                                {isUploading[kpi.id] && <Progress value={uploadProgress[kpi.id] || 0} className="h-1" />}
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs">{score.toFixed(1)}</TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </div>
              </TooltipProvider>
            )}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-xl font-bold">Total Skor: <span className="text-primary">{typeof totalScore === 'number' && !isNaN(totalScore) ? totalScore.toFixed(1) : '0.0'}</span></div>
              <Button onClick={handleSave} disabled={isApproved || isAnyUploading || (typeof totalScore === 'number' && isNaN(totalScore))}>
                {isAnyUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isAnyUploading ? "Sedang Mengunggah..." : (existingDataForPeriod ? "Simpan Perubahan" : "Simpan Pencapaian")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedEmployeeId && !kpiSetup && (
         <Card>
            <CardHeader><CardTitle className="text-destructive">Pengaturan KPI Tidak Ditemukan</CardTitle></CardHeader>
            <CardContent>
                <p>Tidak ada pengaturan KPI yang aktif untuk posisi <strong>{selectedEmployee?.position}</strong>, departemen <strong>{selectedEmployee?.department}</strong>, dan level <strong>{selectedEmployee?.level}</strong> pada periode yang dipilih.</p>
                <p className="mt-2">Silakan hubungi administrator Anda untuk membuat atau mengaktifkan pengaturan KPI yang sesuai.</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}

export default function InputAchievementPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <InputAchievementContent />
        </React.Suspense>
    )
}
